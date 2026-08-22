import { inngest } from '../../client';
import { writeDraft } from '../../../lib/agents/seo/writer';

export const writeDraftFn = inngest.createFunction(
  { id: 'seo-write-draft', retries: 2, triggers: [{ event: 'seo/write-draft' }] },
  async ({ event }: any) => {
    const { storeId, brief, type = 'collection' } = event.data;
    return writeDraft({ storeId, brief, type });
  }
);
