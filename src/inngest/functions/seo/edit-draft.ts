import { inngest } from '../../client';
import { editDraft } from '../../../lib/agents/seo/editor';

export const editDraftFn = inngest.createFunction(
  { id: 'seo-edit-draft', retries: 2, triggers: [{ event: 'seo/edit-draft' }] },
  async ({ event }: any) => {
    const { storeId, draft, type = 'collection' } = event.data;
    return editDraft({ storeId, draft, type });
  }
);
