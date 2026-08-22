import { inngest } from '../../client';
import { ensureJob } from './ensure-job';
import { researchFn } from './research';
import { createBriefFn } from './create-brief';
import { writeDraftFn } from './write-draft';
import { editDraftFn } from './edit-draft';
import { optimizeDraftFn } from './optimize-draft';
import { evaluateFn } from './evaluate';
import { saveDraftFn } from './save-draft';
import { updateJobStatusFn } from '../update-job-status';
import { logEventFn } from '../log-event';
import { saveApprovalFn } from './save-approval';
import { publishFn } from './publish';

export const seoJob = inngest.createFunction(
  { id: 'seo-job', retries: 2, triggers: [{ event: 'seo/job.requested' }] },
  async ({ event, step }: any) => {
    if (!process.env.XAI_API_KEY) throw new Error('XAI_API_KEY is required');
    if (!process.env.TAVILY_API_KEY) throw new Error('TAVILY_API_KEY is required');

    const data = event.data as { storeId: string; keyword: string; jobId?: string; job_id?: string; type?: string };
    const storeId = data.storeId;
    const keyword = data.keyword;
    const type = data.type || 'collection';
    const providedJobId = data.jobId || data.job_id;

    let job = await step.invoke('ensure-job', {
      function: ensureJob,
      data: { storeId, keyword, type, jobId: providedJobId },
    });

    await step.invoke('log-start', {
      function: logEventFn,
      data: { storeId, actor: 'system', action: 'job.started', payload: { keyword, type }, jobId: job.id },
    });

    let researchResult: any, brief: any, draft: any, edited: any, optimized: any, scores: any, draftRecord: any;

    try {
      try {
        researchResult = await step.invoke('research', {
          function: researchFn,
          data: { storeId, keyword, type },
        });
      } catch (err: any) {
        await step.invoke('log-research-fail', {
          function: logEventFn,
          data: { storeId, actor: 'system', action: 'research.failed', payload: { error: err.message || String(err) }, jobId: job.id },
        });
        researchResult = { keyword, summary: `Basic research summary for ${type} about ${keyword}.`, raw: {}, type };
      }

      try {
        brief = await step.invoke('create-brief', {
          function: createBriefFn,
          data: { storeId, keyword, research: researchResult, type },
        });
      } catch (err: any) {
        await step.invoke('log-brief-fail', {
          function: logEventFn,
          data: { storeId, actor: 'system', action: 'brief.failed', payload: { error: err.message || String(err) }, jobId: job.id },
        });
        brief = { keyword, type, intent: 'informational commercial', sections: ['intro'], researchSummary: '' };
      }

      try {
        draft = await step.invoke('write', {
          function: writeDraftFn,
          data: { storeId, brief, type },
        });
      } catch (err: any) {
        await step.invoke('log-write-fail', {
          function: logEventFn,
          data: { storeId, actor: 'system', action: 'write.failed', payload: { error: err.message || String(err) }, jobId: job.id },
        });
        draft = createBasicDraft(type, keyword);
      }

      edited = await step.invoke('edit', {
        function: editDraftFn,
        data: { storeId, draft, type },
      });

      optimized = await step.invoke('optimize', {
        function: optimizeDraftFn,
        data: { storeId, draft: edited, type },
      });

      scores = await step.invoke('evaluate', {
        function: evaluateFn,
        data: { draft: optimized, type },
      });

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
          evaluationScores: scores,
          rawResearch: researchResult,
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

    const approval = await step.waitForEvent('approval/decided', {
      timeout: '1d',
      if: `event.data.jobId == "${job.id}"`,
    });
    const approvalData = (approval as any)?.data || {};

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

    try {
      await step.invoke('save-approval', {
        function: saveApprovalFn,
        data: {
          jobId: job.id,
          storeId,
          status: approvalData.status,
          reviewerNotes: approvalData.notes,
          editedPayload: approvalData.editedPayload,
        },
      });
      await step.invoke('log-approval', {
        function: logEventFn,
        data: { storeId, actor: 'human', action: 'approval.' + approvalData.status, payload: approvalData, jobId: job.id },
      });

      if (approvalData.status === 'rejected') {
        await step.invoke('update-job-rejected', {
          function: updateJobStatusFn,
          data: { jobId: job.id, status: 'rejected' },
        });
        return { status: 'rejected' };
      }

      const finalDraft = approvalData.status === 'edited' && approvalData.editedPayload ? approvalData.editedPayload : optimized;

      const result = await step.invoke('publish', {
        function: publishFn,
        data: { storeId, draft: finalDraft, type },
      });

      await step.invoke('update-job-completed', {
        function: updateJobStatusFn,
        data: { jobId: job.id, status: 'completed', output: result },
      });
      await step.invoke('log-completed', {
        function: logEventFn,
        data: { storeId, actor: 'system', action: 'job.completed', payload: { shopify: result }, jobId: job.id },
      });

      return { status: 'completed', shopifyResult: result };
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

function createBasicDraft(type: string, keyword: string) {
  const suffix = type === 'collection' ? ' | Collection' : type === 'page' ? ' | Page' : ' | Blog';
  return {
    title: keyword + suffix,
    handle: keyword.toLowerCase().replace(/\s+/g, '-'),
    bodyHtml: `<h1>${keyword}</h1><p>Basic placeholder content for Shopify ${type} about ${keyword}. This was generated as a fallback. Please review and edit.</p>`,
    metaTitle: keyword,
    metaDescription: `Learn about ${keyword} in this ${type}.`,
    type,
  };
}
