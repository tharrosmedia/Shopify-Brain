import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'shopify-brain',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
