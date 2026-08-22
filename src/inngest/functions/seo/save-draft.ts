import { inngest } from '../../client';
import { saveDraft } from '../../../lib/db/drafts';

export const saveDraftFn = inngest.createFunction(
  { id: 'seo-save-draft', retries: 2, triggers: [{ event: 'seo/save-draft' }] },
  async ({ event }: any) => {
    const data = event.data;
    return saveDraft({
      jobId: data.jobId,
      storeId: data.storeId,
      title: data.title,
      handle: data.handle,
      bodyHtml: data.bodyHtml,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      evaluationScores: data.evaluationScores,
      rawResearch: data.rawResearch,
    });
  }
);
