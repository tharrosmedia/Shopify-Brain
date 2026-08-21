import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serve as inngestServe } from 'inngest/hono';
import { inngest } from './inngest/client';
import { functions } from './inngest/index';

const app = new Hono();

app.get('/', (c) => c.text('Shopify Brain'));

app.post('/api/inngest', inngestServe({ client: inngest, functions }));

app.post('/api/approve', async (c) => {
  const body = await c.req.json();
  await inngest.send({ name: 'approval/decided', data: body });
  return c.json({ received: true });
});

const port = Number(process.env.PORT || 3000);
console.log('Server on port ' + port);
serve({ fetch: app.fetch, port });
