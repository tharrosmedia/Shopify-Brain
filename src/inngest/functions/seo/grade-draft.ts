import { inngest } from '../../client';
import { gradeDraft } from '../../../lib/agents/seo/grader';

export const gradeDraftFn = inngest.createFunction(
  { id: 'seo-grade-draft', retries: 2, triggers: [{ event: 'seo/grade-draft' }] },
  async ({ event, step }: any) => {
    const { draft, type = 'collection', platform, brandVoice, metafieldDefinitions, placement, products, brief, research } = event.data;
    return await step.run('grade-draft', async () => {
      return gradeDraft({ draft, type, platform, brandVoice, metafieldDefinitions, placement, products, brief, research });
    });
  }
);
