import { inngest } from '../../client';
import { optimizeDraft } from '../../../lib/agents/seo/optimizer';

export const optimizeDraftFn = inngest.createFunction(
  { id: 'seo-optimize-draft', retries: 2, triggers: [{ event: 'seo/optimize-draft' }] },
  async ({ event, step }: any) => {
    const { storeId, draft, type = 'collection', platform, brandVoice } = event.data;
    return await step.run('optimize-draft', async () => {
      return optimizeDraft({ storeId, draft, type, platform, brandVoice });
    });
  }
);
