import { inngest } from '../../client';
import { writeDraft } from '../../../lib/agents/seo/writer';

export const writeDraftFn = inngest.createFunction(
  { id: 'seo-write-draft', retries: 2, triggers: [{ event: 'seo/write-draft' }] },
  async ({ event, step }: any) => {
    const { storeId, brief, type = 'collection', platform, brandVoice, metafieldDefinitions, placement, products } = event.data;
    return await step.run('write-draft', async () => {
      return writeDraft({ storeId, brief, type, platform, brandVoice, metafieldDefinitions, placement, products });
    });
  }
);
