import { inngest } from '../../client';
import { evaluate } from '../../../lib/agents/core/evaluate';

export const evaluateFn = inngest.createFunction(
  { id: 'seo-evaluate', retries: 2, triggers: [{ event: 'seo/evaluate' }] },
  async ({ event }: any) => {
    const { draft, type = 'collection' } = event.data;
    return evaluate(draft, type);
  }
);
