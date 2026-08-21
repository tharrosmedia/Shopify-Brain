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
    const { storeId, keyword } = event.data as { storeId: string; keyword: string };

    const job = await step.run('create-job', () => createJob({ storeId, domain: 'seo', type: 'catalog_page', input: { keyword } }));
    await step.run('log-start', () => logEvent(storeId, 'system', 'job.started', { keyword }, job.id));

    const researchResult = await step.run('research', () => research({ storeId, keyword }));

    const brief = await step.run('brief', () => createBrief({ storeId, keyword, research: researchResult }));

    const draft = await step.run('write', () => writeDraft({ storeId, brief }));

    const edited = await step.run('edit', () => editDraft({ storeId, draft }));

    const optimized = await step.run('optimize', () => optimizeDraft({ storeId, draft: edited }));

    const scores = await step.run('evaluate', () => evaluate(optimized));

    const draftRecord = await step.run('save-draft', () => saveDraft({
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

    const approval = await step.waitForEvent('approval/decided', { timeout: '1d' });
    const approvalData = (approval as any)?.data || {};

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
  }
);
