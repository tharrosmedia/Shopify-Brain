import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function retrieve(storeId: string, query: string, limit: number = 5): Promise<string[]> {
  if (!query) return [];
  const sql = neon(process.env.DATABASE_URL!);
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
    // Fallback: simple text search for agent robustness when no OPENAI key or error
    const res = await sql`
      SELECT content FROM knowledge 
      WHERE store_id = ${storeId} 
        AND content ILIKE ${'%' + query + '%'}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;
    return res.map((r: any) => r.content);
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
    // If embedding fails (no key etc), still write without embedding (graceful)
    console.warn('embedding failed, writing without vector', e);
    await sql`
      INSERT INTO knowledge (store_id, content, metadata) 
      VALUES (${storeId}, ${content}, ${metadata})
    `;
  }
}
