import { inngest } from '../../client';
import { publishContent } from '../../../lib/agents/seo/publisher';

export const publishFn = inngest.createFunction(
  { id: 'seo-publish', retries: 2, triggers: [{ event: 'seo/publish' }] },
  async ({ event, step }: any) => {
    const { storeId, draft, type = 'collection', platform, brandVoice } = event.data;
    return await step.run('publish-content', async () => {
      return publishContent({ storeId, draft, type, platform, brandVoice });
    });
  }
);
