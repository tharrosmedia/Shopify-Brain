import { inngest } from '../../client';
import { research } from '../../../lib/agents/seo/research';

export const researchFn = inngest.createFunction(
  { id: 'seo-research', retries: 2, triggers: [{ event: 'seo/research' }] },
  async ({ event }: any) => {
    const { storeId, keyword, type = 'collection' } = event.data;
    return research({ storeId, keyword, type });
  }
);
