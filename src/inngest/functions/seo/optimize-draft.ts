import { inngest } from '../../client';
import { optimizeDraft } from '../../../lib/agents/seo/optimizer';

export const optimizeDraftFn = inngest.createFunction(
  { id: 'seo-optimize-draft', retries: 2, triggers: [{ event: 'seo/optimize-draft' }] },
  async ({ event }: any) => {
    const { storeId, draft, type = 'collection' } = event.data;
    return optimizeDraft({ storeId, draft, type });
  }
);
