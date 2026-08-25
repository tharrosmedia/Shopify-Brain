import 'dotenv/config';
import { inngest } from '../src/inngest/client.js';

const storeId = process.env.DEV_STORE_ID as string;
if (!storeId) {
  console.error('DEV_STORE_ID or explicit storeId required for script');
  process.exit(1);
}
await inngest.send({
  name: 'seo/job.requested',
  data: {
    storeId,
    keyword: 'daikin single zone mini split',
    type: 'collection',
    brandVoice: { text: 'Professional, helpful, benefit-focused for HVAC.' },
  },
});
console.log('Triggered for keyword daikin single zone mini split (type: collection)');
