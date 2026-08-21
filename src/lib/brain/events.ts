import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

export async function logEvent(storeId: string, actor: string, action: string, payload: Record<string, unknown> = {}, jobId?: string): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`INSERT INTO events (store_id, job_id, actor, action, payload) VALUES (${storeId}, ${jobId || null}, ${actor}, ${action}, ${payload})`;
}
