import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

export async function retrieve(storeId: string, query: string, limit: number = 5): Promise<string[]> {
  return [];
}

export async function writeKnowledge(storeId: string, content: string, metadata: Record<string, unknown> = {}): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`INSERT INTO knowledge (store_id, content, metadata) VALUES (${storeId}, ${content}, ${metadata})`;
}
