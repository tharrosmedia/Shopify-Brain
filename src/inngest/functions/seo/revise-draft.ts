import { inngest } from '../../client';
import { reviseDraft } from '../../../lib/agents/seo/revise-draft';

export const reviseDraftFn = inngest.createFunction(
  { id: 'seo-revise-draft', retries: 2, triggers: [{ event: 'seo/revise-draft' }] },
  async ({ event, step }: any) => {
    const { draft, feedback, type = 'collection', platform, brandVoice, metafieldDefinitions, placement, products, brief, research } = event.data;
    return await step.run('revise-draft', async () => {
      return reviseDraft({ draft, feedback, type, platform, brandVoice, metafieldDefinitions, placement, products, brief, research });
    });
  }
);
