import { inngest } from '../client';
import { research } from '../../lib/agents/seo/research';
import { createBrief } from '../../lib/agents/seo/brief';
import { writeDraft } from '../../lib/agents/seo/writer';
import { editDraft } from '../../lib/agents/seo/editor';
import { optimizeDraft } from '../../lib/agents/seo/optimizer';
import { publishCatalogPage } from '../../lib/agents/seo/publisher';
import { evaluate } from '../../lib/agents/core/evaluate';
import { createJob, updateJobStatus } from '../../lib/db/jobs';
import { saveDraft } from '../../lib/db/drafts';
import { saveApproval } from '../../lib/db/approvals';
import { logEvent } from '../../lib/brain/events';

export const seoCatalogPage = (inngest.createFunction as any)(
  { id: 'seo-catalog-page', retries: 2, triggers: { event: 'seo/catalog-page.requested' } },
  async ({ event, step }: any) => {
    if (!process.env.XAI_API_KEY) throw new Error('XAI_API_KEY is required');
    if (!process.env.TAVILY_API_KEY) throw new Error('TAVILY_API_KEY is required');

    const data = event.data as { storeId: string; keyword: string; jobId?: string; job_id?: string };
    const storeId = data.storeId;
    const keyword = data.keyword;
    const providedJobId = data.jobId || data.job_id;

    let job;
    if (providedJobId) {
      job = { id: providedJobId };
    } else {
      job = await step.run('create-job', () => createJob({ storeId, domain: 'seo', type: 'catalog_page', input: { keyword } }));
    }
    await step.run('log-start', () => logEvent(storeId, 'system', 'job.started', { keyword }, job.id));

    let researchResult: any, brief: any, draft: any, edited: any, optimized: any, scores: any, draftRecord: any;

    try {
      researchResult = await step.run('research', () => research({ storeId, keyword }));

      brief = await step.run('brief', () => createBrief({ storeId, keyword, research: researchResult }));

      draft = await step.run('write', () => writeDraft({ storeId, brief }));

      edited = await step.run('edit', () => editDraft({ storeId, draft }));

      optimized = await step.run('optimize', () => optimizeDraft({ storeId, draft: edited }));

      scores = await step.run('evaluate', () => evaluate(optimized));

      draftRecord = await step.run('save-draft', () => saveDraft({
        jobId: job.id,
        storeId,
        title: optimized.title,
        handle: optimized.handle,
        bodyHtml: optimized.bodyHtml,
        metaTitle: optimized.metaTitle,
        metaDescription: optimized.metaDescription,
        evaluationScores: scores,
        rawResearch: researchResult,
      }));

      await step.run('update-job-awaiting', () => updateJobStatus(job.id, 'awaiting_approval'));
      await step.run('log-awaiting', () => logEvent(storeId, 'system', 'job.awaiting_approval', {}, job.id));
    } catch (err: any) {
      console.error('SEO catalog job failed', err);
      if (job?.id) {
        try { await updateJobStatus(job.id, 'failed'); } catch {}
        try { await logEvent(storeId, 'system', 'job.failed', { error: err.message || String(err) }, job.id); } catch {}
      }
      throw err;
    }

    const approval = await step.waitForEvent('approval/decided', { timeout: '1d' });
    const approvalData = (approval as any)?.data || {};

    if (!approval || !approvalData.status) {
      await step.run('log-timeout', () => logEvent(storeId, 'system', 'job.timeout', {}, job.id));
      if (job?.id) {
        try { await updateJobStatus(job.id, 'failed'); } catch {}
      }
      return { status: 'no-decision' };
    }

    try {
      await step.run('save-approval', () => saveApproval({
        jobId: job.id,
        storeId,
        status: approvalData.status,
        reviewerNotes: approvalData.notes,
        editedPayload: approvalData.editedPayload,
      }));
      await step.run('log-approval', () => logEvent(storeId, 'human', 'approval.' + approvalData.status, approvalData, job.id));

      if (approvalData.status === 'rejected') {
        await step.run('update-job-rejected', () => updateJobStatus(job.id, 'rejected'));
        return { status: 'rejected' };
      }

      const finalDraft = approvalData.status === 'edited' && approvalData.editedPayload ? approvalData.editedPayload : optimized;

      const result = await step.run('publish', () => publishCatalogPage({ storeId, draft: finalDraft }));

      await step.run('update-job-completed', () => updateJobStatus(job.id, 'completed', result));
      await step.run('log-completed', () => logEvent(storeId, 'system', 'job.completed', { shopify: result }, job.id));

      return { status: 'completed', shopifyResult: result };
    } catch (err: any) {
      console.error('SEO catalog job failed', err);
      if (job?.id) {
        try { await updateJobStatus(job.id, 'failed'); } catch {}
        try { await logEvent(storeId, 'system', 'job.failed', { error: err.message || String(err) }, job.id); } catch {}
      }
      throw err;
    }
  }
);
