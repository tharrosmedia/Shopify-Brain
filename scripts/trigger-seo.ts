import 'dotenv/config';
import { inngest } from '../src/inngest/client.js';

const storeId = process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
await inngest.send({
  name: 'seo/catalog-page.requested',
  data: {
    storeId,
    keyword: 'daikin single zone mini split',
  },
});
console.log('Triggered for keyword daikin single zone mini split');
