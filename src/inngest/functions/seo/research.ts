import { inngest } from '../../client';
import { research } from '../../../lib/agents/seo/research';

export const researchFn = inngest.createFunction(
  { id: 'seo-research', retries: 2, triggers: [{ event: 'seo/research' }] },
  async ({ event, step }: any) => {
    const { storeId, keyword, type = 'collection', platform, brandVoice, metafieldDefinitions, placement } = event.data;
    return await step.run('do-research', async () => {
      return research({ storeId, keyword, type, platform, brandVoice, metafieldDefinitions, placement });
    });
  }
);
