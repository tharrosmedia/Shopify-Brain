import { inngest } from '../client';
import { logEvent } from '../../lib/brain/events';

export const logEventFn = inngest.createFunction(
  { id: 'log-event', retries: 1, triggers: [{ event: 'log-event' }] },
  async ({ event }: any) => {
    const { storeId, actor, action, payload = {}, jobId } = event.data;
    await logEvent(storeId, actor, action, payload, jobId);
  }
);
