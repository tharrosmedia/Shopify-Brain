import { inngest } from '../../client';
import { ensureJob } from './ensure-job';
import { researchFn } from './research';
import { createBriefFn } from './create-brief';
import { writeDraftFn } from './write-draft';
import { editDraftFn } from './edit-draft';
import { optimizeDraftFn } from './optimize-draft';
import { evaluateFn } from './evaluate';
import { gradeDraftFn } from './grade-draft';
import { reviseDraftFn } from './revise-draft';
import { saveDraftFn } from './save-draft';
import { updateJobStatusFn } from '../update-job-status';
import { logEventFn } from '../log-event';
import { publishFn } from './publish';
import { publishContent } from '../../../lib/agents/seo/publisher';
import { updateJobStatus } from '../../../lib/db/jobs';
import { logEvent } from '../../../lib/brain/events';
import { saveApproval } from '../../../lib/db/approvals';
import { getStore } from '../../../lib/db/stores';
import { createAdminClient } from '../../../lib/shopify/client';
import { fetchMetafieldDefinitions, fetchMetafieldValueSamples } from '../../../lib/shopify/content';
import { writeKnowledge } from '../../../lib/brain/memory';
import { listProducts, searchProducts } from '../../../lib/db/products';
import { selectProductsForCollection } from '../../../lib/agents/seo/select-products';
import { checkTopicGate } from '../../../lib/agents/seo/topic-gate';

export const seoJob = inngest.createFunction(
  { id: 'seo-job', retries: 2, triggers: [{ event: 'seo/job.requested' }] },
  async ({ event, step }: any) => {
    const data = event.data as { storeId: string; keyword: string; jobId?: string; job_id?: string; type?: string; platform?: string; brandVoice?: any; seoRules?: any };
    const storeId = data.storeId;
    const keyword = data.keyword;
    const type = data.type || 'collection';
    const platform = data.platform || 'shopify';
    const brandVoice = data.brandVoice;
    const providedSeoRules = data.seoRules;
    const providedJobId = data.jobId || data.job_id;
    const jobId = providedJobId || 'unknown';

    console.log('[INNGEST] seo-job handler started', { jobId, type, eventData: event.data });

    await step.run('start-job', async () => {
      await updateJobStatus(jobId, 'running');
      await logEvent(storeId, 'system', 'job.started', { keyword, type }, jobId);
    });

    if (!process.env.XAI_API_KEY) {
      await step.run('fail-xai', async () => {
        await updateJobStatus(jobId, 'failed');
        await logEvent(storeId, 'system', 'job.failed', { error: 'XAI_API_KEY is required' }, jobId);
      });
      throw new Error('XAI_API_KEY is required');
    }
    if (!process.env.TAVILY_API_KEY) {
      await step.run('fail-tavily', async () => {
        await updateJobStatus(jobId, 'failed');
        await logEvent(storeId, 'system', 'job.failed', { error: 'TAVILY_API_KEY is required' }, jobId);
      });
      throw new Error('TAVILY_API_KEY is required');
    }

    let job: any;
    try {
      job = await step.invoke('ensure-job', {
        function: ensureJob,
        data: { storeId, keyword, type, platform, brandVoice, jobId: providedJobId },
      });
    } catch (err: any) {
      console.error('SEO job failed at ensure', err);
      if (jobId && jobId !== 'unknown') {
        try {
          await step.invoke('update-ensure-fail', {
            function: updateJobStatusFn,
            data: { jobId, status: 'failed' },
          });
        } catch {}
        try {
          await step.invoke('log-ensure-fail', {
            function: logEventFn,
            data: { storeId, actor: 'system', action: 'job.failed', payload: { error: err.message || String(err) }, jobId },
          });
        } catch {}
      }
      throw err;
    }

    let researchResult: any, brief: any, draft: any, edited: any, optimized: any, scores: any, draftRecord: any;

    // Load placement + live metafield defs. Pass only RELEVANT for this job type (per preference).
    // But always ensure FULL schema + values are in knowledge for store-wide awareness.
    let placement: any = {};
    let metafieldDefinitions: any[] = []; // relevant slice for this job
    let products: any[] = [];
    let metafieldSamples: any[] = [];
    let seoRules: any = providedSeoRules;
    let storeName = '';
    let productTypes: string[] = [];
    try {
      const store = await getStore(storeId);
      if (store?.config?.placement) {
        placement = store.config.placement || {};
      }
      if (!seoRules && store?.config?.seoRules) {
        seoRules = store.config.seoRules;
      }
      if (store && store.shopify_access_token) {
        const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
        const allDefs = await fetchMetafieldDefinitions(client);
        const ownerType = type === 'collection' ? 'COLLECTION' : type === 'page' ? 'PAGE' : type === 'blog' ? 'ARTICLE' : 'COLLECTION';
        metafieldDefinitions = allDefs.filter((d: any) => d.ownerType === ownerType);

        // Write FULL schema + samples to memory (for agent's overall store mind)
        try {
          const valueSamples = await fetchMetafieldValueSamples(client);
          const schemaStr = JSON.stringify(valueSamples).slice(0, 8000);
          await writeKnowledge(storeId, `Full store metafield schema and examples: ${schemaStr}`, {
            type: 'metafield_schema_full', source: 'job'
          });
          const key = ownerType;
          metafieldSamples = (valueSamples && valueSamples[key] && valueSamples[key].examples) || [];
        } catch (e) {
          console.warn('[SEO] failed to write full metafield samples', e);
        }

        // Still write relevant for job context
        if (metafieldDefinitions.length > 0) {
          const schemaSummary = metafieldDefinitions.map((d: any) => ({
            name: d.name, namespace: d.namespace, key: d.key, type: d.type?.name, description: d.description
          }));
          await writeKnowledge(storeId, `Available metafield definitions for ${type}s (use selectively where they help SEO for the keyword): ${JSON.stringify(schemaSummary)}`, {
            type: 'metafield_schema', ownerType, source: 'job'
          });
        }
      }

      // Load products from DB for agent context (recommend/include in collections etc.)
      if (type === 'collection') {
        try {
          const byKeyword = await searchProducts(storeId, keyword, 10);
          const top = await listProducts(storeId, 20);
          // dedup by handle
          const seen = new Set();
          products = [...byKeyword, ...top].filter(p => {
            if (seen.has(p.handle)) return false;
            seen.add(p.handle);
            return true;
          }).slice(0, 20);
        } catch {}
      } else {
        products = await listProducts(storeId, 10);
      }
      storeName = store?.name || store?.shopify_domain || '';
      productTypes = Array.from(new Set((products || []).map((p: any) => p.productType).filter(Boolean)));
    } catch (e) {
      console.warn('[SEO] failed to load placement/defs for agents', e);
    }

    try {
      try {
        researchResult = await step.invoke('research', {
          function: researchFn,
          data: { storeId, keyword, type, platform, brandVoice, seoRules, metafieldDefinitions, placement, products, metafieldSamples, storeName, productTypes },
        });
      } catch (err: any) {
        await step.invoke('log-research-fail', {
          function: logEventFn,
          data: { storeId, actor: 'system', action: 'research.failed', payload: { error: err.message || String(err) }, jobId: job.id },
        });
        researchResult = { keyword, summary: `Basic research summary for ${type} about ${keyword}.`, raw: {}, type, platform, brandVoice };
      }

      try {
        brief = await step.invoke('create-brief', {
          function: createBriefFn,
          data: { storeId, keyword, research: researchResult, type, platform, brandVoice, seoRules, metafieldDefinitions, placement, products, metafieldSamples, storeName, productTypes },
        });
      } catch (err: any) {
        await step.invoke('log-brief-fail', {
          function: logEventFn,
          data: { storeId, actor: 'system', action: 'brief.failed', payload: { error: err.message || String(err) }, jobId: job.id },
        });
        brief = { keyword, type, platform, brandVoice, intent: 'informational commercial', secondaryKeywords: [], mustCover: [], mustNotCover: [], allowedClaims: [], sectionOutline: [{heading:'intro', purpose: 'intro'}], researchSummary: '', productPlan: {mode: 'manual', selectedProductIds: []} };
      }

      try {
        draft = await step.invoke('write', {
          function: writeDraftFn,
          data: { storeId, brief, type, platform, brandVoice, seoRules, metafieldDefinitions, placement, products, metafieldSamples, storeName, productTypes },
        });
      } catch (err: any) {
        await step.invoke('log-write-fail', {
          function: logEventFn,
          data: { storeId, actor: 'system', action: 'write.failed', payload: { error: err.message || String(err) }, jobId: job.id },
        });
        draft = createBasicDraft(type, keyword, platform, brandVoice);
      }

      if (type === 'collection') {
        const sel = selectProductsForCollection({ storeId, keyword, brief, candidateProducts: products, llmSelectedIds: draft.selectedProductIds });
        draft.selectedProducts = sel.selected;
      }

      edited = await step.invoke('edit', {
        function: editDraftFn,
        data: { storeId, draft, type, platform, brandVoice, seoRules, metafieldDefinitions, placement, products, metafieldSamples, storeName, productTypes },
      });

      optimized = await step.invoke('optimize', {
        function: optimizeDraftFn,
        data: { storeId, draft: edited, type, platform, brandVoice, seoRules, metafieldDefinitions, placement, products, metafieldSamples, storeName, productTypes },
      });

      // Internal grader-driven iteration (strictly internal helpers, no standalone event triggers).
      // Use structured seoRules for all agents. Keep single highest-scoring draft.
      // Only accept revise if score strictly improves. Stop early on no gain.
      let current = optimized;
      scores = await step.invoke('grade', {
        function: gradeDraftFn,
        data: { draft: current, type, platform, brandVoice, seoRules, metafieldDefinitions, placement, products, brief, research: researchResult, metafieldSamples, storeName, productTypes },
      });

      let gate: any;
      // Integrate deterministic topic gate inside loop to steer (miss lowers score to force revise)
      gate = checkTopicGate({ draft: current, brief, research: researchResult });
      if (gate.violations && gate.violations.length) {
        scores = scores || {};
        scores.topicGate = gate;
        scores.score = Math.min(scores.score ?? 10, 7.0);
        scores.suggestions = [...(scores.suggestions || []), ...gate.violations.map((v: string) => `topic: ${v}`)];
        scores.violations = [...(scores.violations || []), ...gate.violations.map((v: string) => ({ ruleId: 'content-topic', note: v }))];
      }

      let best = current;
      let bestScore = scores?.score ?? 0;
      let bestFeedback = scores;

      let iterations = 0;
      const MAX_ITER = 8;
      let itersSinceImprovement = 0;
      while (iterations < MAX_ITER && bestScore < 8.5) {
        iterations += 1;
        await step.invoke('log-iteration', {
          function: logEventFn,
          data: { storeId, actor: 'system', action: 'job.iteration', payload: { iteration: iterations, score: scores?.score || 0, suggestions: scores?.suggestions || [] }, jobId: job.id },
        });

        current = await step.invoke('revise', {
          function: reviseDraftFn,
          data: { draft: current, feedback: scores, type, platform, brandVoice, seoRules, metafieldDefinitions, placement, products, brief, research: researchResult, metafieldSamples, storeName, productTypes },
        });

        // Re-optimize meta/schema after revision
        current = await step.invoke('optimize', {
          function: optimizeDraftFn,
          data: { storeId, draft: current, type, platform, brandVoice, seoRules, metafieldDefinitions, placement, products },
        });

        if (type === 'collection') {
          const sel = selectProductsForCollection({ storeId, keyword, brief, candidateProducts: products, llmSelectedIds: current.selectedProductIds });
          current.selectedProducts = sel.selected;
        }

        scores = await step.invoke('grade', {
          function: gradeDraftFn,
          data: { draft: current, type, platform, brandVoice, seoRules, metafieldDefinitions, placement, products, brief, research: researchResult, metafieldSamples, storeName, productTypes },
        });

        // Integrate deterministic topic gate inside loop to steer (miss lowers score to force revise)
        gate = checkTopicGate({ draft: current, brief, research: researchResult });
        if (gate.violations && gate.violations.length) {
          scores = scores || {};
          scores.topicGate = gate;
          scores.score = Math.min(scores.score ?? 10, 7.0);
          scores.suggestions = [...(scores.suggestions || []), ...gate.violations.map((v: string) => `topic: ${v}`)];
          scores.violations = [...(scores.violations || []), ...gate.violations.map((v: string) => ({ ruleId: 'content-topic', note: v }))];
        }

        if ((scores?.score ?? 0) > bestScore) {
          best = current;
          bestScore = scores.score;
          bestFeedback = scores;
          itersSinceImprovement = 0;
        } else {
          itersSinceImprovement++;
          if (itersSinceImprovement >= 2) break; // stop early on no gain
        }
      }

      optimized = best;
      scores = bestFeedback;

      if (type === 'collection') {
        const sel = selectProductsForCollection({ storeId, keyword, brief, candidateProducts: products, llmSelectedIds: optimized.selectedProductIds });
        optimized.selectedProducts = sel.selected;
      }

      // P2: final topic gate annotation (advisory)
      gate = checkTopicGate({ draft: optimized, brief, research: researchResult });
      if (!scores) scores = {};
      scores.topicGate = gate;
      if (gate.violations && gate.violations.length) {
        scores.suggestions = [...(scores.suggestions || []), ...gate.violations.map((v: string) => `topic: ${v}`)];
      }

      draftRecord = await step.invoke('save-draft', {
        function: saveDraftFn,
        data: {
          jobId: job.id,
          storeId,
          title: optimized.title,
          handle: optimized.handle,
          bodyHtml: optimized.bodyHtml,
          metaTitle: optimized.metaTitle,
          metaDescription: optimized.metaDescription,
          metafields: optimized.metafields,
          schemaJsonLd: optimized.schemaJsonLd,
          evaluationScores: scores,
          rawResearch: researchResult,
          selectedProducts: optimized.selectedProducts,
          collectionRules: optimized.collectionRules,
          brief,
        },
      });

      await step.invoke('update-job-awaiting', {
        function: updateJobStatusFn,
        data: { jobId: job.id, status: 'awaiting_approval' },
      });
      await step.invoke('log-awaiting', {
        function: logEventFn,
        data: { storeId, actor: 'system', action: 'job.awaiting_approval', payload: {}, jobId: job.id },
      });
    } catch (err: any) {
      console.error('SEO job failed', err);
      if (job?.id) {
        try {
          await step.invoke('update-failed', {
            function: updateJobStatusFn,
            data: { jobId: job.id, status: 'failed' },
          });
        } catch {}
        try {
          await step.invoke('log-failed', {
            function: logEventFn,
            data: { storeId, actor: 'system', action: 'job.failed', payload: { error: err.message || String(err) }, jobId: job.id },
          });
        } catch {}
      }
      throw err;
    }

    // 'awaiting_approval' was briefly set above (visible in UI/queues).
    // Now decide: wait for human or auto-approve per store autonomy.
    let approvalData: any = {};
    try {
      const store = await getStore(storeId);
      const requireApproval = store?.config?.autonomy?.requireApproval !== false;
      if (requireApproval) {
        const approval = await step.waitForEvent('wait-for-approval', {
          event: 'approval/decided',
          timeout: '1d',
          match: 'data.jobId',
        });
        approvalData = (approval as any)?.data || {};
        if (!approval || !approvalData.status) {
          await step.invoke('log-timeout', {
            function: logEventFn,
            data: { storeId, actor: 'system', action: 'job.timeout', payload: {}, jobId: job.id },
          });
          if (job?.id) {
            try {
               await step.invoke('update-timeout', {
                 function: updateJobStatusFn,
                 data: { jobId: job.id, status: 'timeout' },
               });
            } catch {}
          }
          return { status: 'no-decision' };
        }
      } else {
        approvalData = {
          status: 'approved',
          notes: 'Auto-approved per store autonomy config (requireApproval=false)',
        };
      }
    } catch (e: any) {
      // Safe fallback: require human approval
      const approval = await step.waitForEvent('wait-for-approval', {
        event: 'approval/decided',
        timeout: '1d',
        match: 'data.jobId',
      });
      approvalData = (approval as any)?.data || {};
      if (!approval || !approvalData.status) {
        await step.invoke('log-timeout', {
          function: logEventFn,
          data: { storeId, actor: 'system', action: 'job.timeout', payload: {}, jobId: job.id },
        });
        if (job?.id) {
          try {
            await step.invoke('update-timeout', {
              function: updateJobStatusFn,
              data: { jobId: job.id, status: 'failed' },
            });
          } catch {}
        }
        return { status: 'no-decision' };
      }
    }

    try {
      // Inline to cut another Inngest hop
      await step.run('save-approval-direct', async () => {
        return saveApproval({
          jobId: job.id,
          storeId,
          status: approvalData.status,
          reviewerNotes: approvalData.notes,
          editedPayload: approvalData.editedPayload,
        });
      });
      const actor = approvalData.notes && approvalData.notes.includes('Auto-approved') ? 'system' : 'human';
      await step.invoke('log-approval', {
        function: logEventFn,
        data: { storeId, actor, action: 'approval.' + approvalData.status, payload: approvalData, jobId: job.id },
      });

      if (approvalData.status === 'rejected') {
        await step.invoke('update-job-rejected', {
          function: updateJobStatusFn,
          data: { jobId: job.id, status: 'rejected' },
        });
        return { status: 'rejected' };
      }

      // Immediate status for fast user feedback (even while publish runs in background)
      await step.run('mark-publishing', async () => {
        await updateJobStatus(job.id, 'publishing');
        await logEvent(storeId, 'system', 'job.publishing', { type }, job.id);
      });

      const finalDraft = approvalData.status === 'edited' && approvalData.editedPayload ? approvalData.editedPayload : optimized;

      // P2 gate on final (edited or not) for audit
      const gate = checkTopicGate({ draft: finalDraft, brief, research: researchResult });
      if (finalDraft.evaluationScores) finalDraft.evaluationScores.topicGate = gate;
      else finalDraft.evaluationScores = { topicGate: gate };

      // Load store once for publish to avoid redundant getStore in publishContent
      let preloadedStore: any = null;
      try {
        const s = await getStore(storeId);
        if (s) preloadedStore = { domain: s.shopify_domain, accessToken: s.shopify_access_token, config: s.config };
      } catch {}

      let result: any;
      try {
        console.time('[PUBLISH] post-approval-to-result');
        // Inline via step.run (instead of step.invoke to separate fn) to cut Inngest hop latency
        result = await step.run('publish-content', async () => {
          return publishContent({ storeId, draft: finalDraft, type, platform, brandVoice, products, preloaded: preloadedStore, metafieldDefinitions });
        });
        console.timeEnd('[PUBLISH] post-approval-to-result');
      } catch (pubErr: any) {
        // If publish itself threw before creating the resource, we will fail below
        console.error('[PUBLISH] hard failure', pubErr);
        result = { error: pubErr?.message || String(pubErr) };
      }

      if (type === 'collection' && result) {
        const pa = result.__productAttach || {};
        const action = (pa.count || 0) > 0 ? 'collection.products.attached' : 'collection.products.empty';
        await step.invoke('log-product-attach', {
          function: logEventFn,
          data: { storeId, actor: 'system', action, payload: { collectionId: result.__ownerId, ids: pa.ids || [], mode: pa.mode || 'manual', count: pa.count || 0 }, jobId: job.id },
        });
      }

      const hasMainResource = !!(result && (result.__ownerId || (result.data && (result.data.collectionCreate || result.data.pageCreate || result.data.articleCreate))));

      if (hasMainResource || !result?.error) {
        await step.invoke('update-job-completed', {
          function: updateJobStatusFn,
          data: { jobId: job.id, status: 'completed', output: result },
        });
        await step.invoke('log-completed', {
          function: logEventFn,
          data: { storeId, actor: 'system', action: 'job.completed', payload: { shopify: result, warnings: result?.__warnings || [] }, jobId: job.id },
        });
        return { status: 'completed', shopifyResult: result };
      }

      // Only reach here on hard failure to create the main resource
      throw new Error('Publish failed to create main resource');
    } catch (err: any) {
      console.error('SEO job failed', err);
      if (job?.id) {
        try {
          await step.invoke('update-failed2', {
            function: updateJobStatusFn,
            data: { jobId: job.id, status: 'failed' },
          });
        } catch {}
        try {
          await step.invoke('log-failed2', {
            function: logEventFn,
            data: { storeId, actor: 'system', action: 'job.failed', payload: { error: err.message || String(err) }, jobId: job.id },
          });
        } catch {}
      }
      throw err;
    }
  }
);

function createBasicDraft(type: string, keyword: string, platform = 'shopify', brandVoice?: any) {
  const suffix = type === 'collection' ? ' | Collection' : type === 'page' ? ' | Page' : ' | Blog';
  const plat = platform ? `${platform} ` : '';
  return {
    title: keyword + suffix,
    handle: keyword.toLowerCase().replace(/\s+/g, '-'),
    bodyHtml: `<h1>${keyword}</h1><p>Content for ${plat}${type} about ${keyword}. (Fallback generation — please review and edit.)</p>`,
    metaTitle: keyword,
    metaDescription: `Learn about ${keyword} in this ${type}.`,
    metafields: [],
    selectedProducts: [],
    collectionRules: [],
    type,
    brandVoice,
  };
}
