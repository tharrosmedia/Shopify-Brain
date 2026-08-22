import { inngest } from '../../client';
import { createJob } from '../../../lib/db/jobs';

export const ensureJob = inngest.createFunction(
  { id: 'seo-ensure-job', retries: 2, triggers: [{ event: 'seo/ensure-job' }] },
  async ({ event }: any) => {
    const { storeId, keyword, type = 'collection', jobId: providedJobId } = event.data;
    if (providedJobId) {
      return { id: providedJobId };
    }
    return createJob({ storeId, domain: 'seo', type, input: { keyword } });
  }
);
