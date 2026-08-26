import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

let embeddingsEnabled = !!process.env.OPENAI_API_KEY;

function textFallback(sql: any, storeId: string, query: string, limit: number) {
  return sql`
    SELECT content FROM knowledge 
    WHERE store_id = ${storeId} 
      AND content ILIKE ${'%' + query + '%'}
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `.then((res: any[]) => res.map((r: any) => r.content));
}

export async function retrieve(storeId: string, query: string, limit: number = 5): Promise<string[]> {
  if (!query) return [];
  const sql = neon(process.env.DATABASE_URL!);
  if (!embeddingsEnabled) {
    return textFallback(sql, storeId, query, limit);
  }
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: query,
    });
    const res = await sql`
      SELECT content FROM knowledge 
      WHERE store_id = ${storeId} 
      ORDER BY embedding <=> ${embedding}::vector 
      LIMIT ${limit}
    `;
    return res.map((r: any) => r.content);
  } catch (e) {
    console.warn('vector retrieve failed, falling back to text search', e);
    embeddingsEnabled = false;
    return textFallback(sql, storeId, query, limit);
  }
}

export async function writeKnowledge(storeId: string, content: string, metadata: Record<string, unknown> = {}): Promise<void> {
  if (!content || !storeId) return;
  const sql = neon(process.env.DATABASE_URL!);
  const normalized = content.trim().toLowerCase();
  // Dedup: exact normalized content match per store (best simple + effective)
  const exists = await sql`
    SELECT 1 FROM knowledge 
    WHERE store_id = ${storeId} AND LOWER(TRIM(content)) = ${normalized} 
    LIMIT 1
  `;
  if (exists.length > 0) return;

  if (!embeddingsEnabled) {
    await sql`
      INSERT INTO knowledge (store_id, content, metadata) 
      VALUES (${storeId}, ${content}, ${metadata})
    `;
    return;
  }

  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: content,
    });
    await sql`
      INSERT INTO knowledge (store_id, content, metadata, embedding) 
      VALUES (${storeId}, ${content}, ${metadata}, ${embedding})
    `;
  } catch (e) {
    // If embedding fails (no key, quota, etc), still write without embedding (graceful)
    console.warn('embedding failed, writing without vector', e);
    embeddingsEnabled = false;
    await sql`
      INSERT INTO knowledge (store_id, content, metadata) 
      VALUES (${storeId}, ${content}, ${metadata})
    `;
  }
}
