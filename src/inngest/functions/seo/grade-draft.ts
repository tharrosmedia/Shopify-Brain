import { inngest } from '../../client';
import { gradeDraft } from '../../../lib/agents/seo/grader';

export const gradeDraftFn = inngest.createFunction(
  // Internal-only (no event triggers). Invoked exclusively via step.invoke from the main seo-job
  // as part of the grader-driven revision loop. Do not trigger directly.
  { id: 'seo-grade-draft', retries: 2 },
  async ({ event, step }: any) => {
    const { draft, type = 'collection', platform, brandVoice, metafieldDefinitions, placement, products, brief, research } = event.data;
    return await step.run('grade-draft', async () => {
      return gradeDraft({ draft, type, platform, brandVoice, metafieldDefinitions, placement, products, brief, research });
    });
  }
);
