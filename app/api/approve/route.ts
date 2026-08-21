import { inngest } from '../../../src/inngest/client';

export async function POST(request: Request) {
  const body = await request.json();
  await inngest.send({ name: 'approval/decided', data: body });
  return Response.json({ received: true });
}
