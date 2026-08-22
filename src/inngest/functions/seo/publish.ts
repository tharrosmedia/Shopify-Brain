import { inngest } from '../../client';
import { publishContent } from '../../../lib/agents/seo/publisher';

export const publishFn = inngest.createFunction(
  { id: 'seo-publish', retries: 2, triggers: [{ event: 'seo/publish' }] },
  async ({ event }: any) => {
    const { storeId, draft, type = 'collection' } = event.data;
    return publishContent({ storeId, draft, type });
  }
);
