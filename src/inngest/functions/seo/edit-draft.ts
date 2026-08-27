import { inngest } from '../../client';
import { editDraft } from '../../../lib/agents/seo/editor';

export const editDraftFn = inngest.createFunction(
  { id: 'seo-edit-draft', retries: 2, triggers: [{ event: 'seo/edit-draft' }] },
  async ({ event, step }: any) => {
    const { storeId, draft, type = 'collection', platform, brandVoice, seoRules, metafieldDefinitions, placement, products } = event.data;
    return await step.run('edit-draft', async () => {
      return editDraft({ storeId, draft, type, platform, brandVoice, seoRules, metafieldDefinitions, placement, products });
    });
  }
);
