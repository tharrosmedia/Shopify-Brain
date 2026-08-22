import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

export async function createJob({ storeId, domain, type, input, status = 'running' }: { storeId: string; domain: string; type: string; input: any; status?: string }) {
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`INSERT INTO jobs (store_id, domain, type, status, input) VALUES (${storeId}, ${domain}, ${type}, ${status}, ${input}) RETURNING id, store_id as "storeId", domain, type, status, input, output, created_at as "createdAt"`;
  return result[0];
}

export async function updateJobStatus(jobId: string, status: string, output?: any) {
  const sql = neon(process.env.DATABASE_URL!);
  if (output !== undefined) {
    await sql`UPDATE jobs SET status = ${status}, output = ${output}, updated_at = now() WHERE id = ${jobId}`;
  } else {
    await sql`UPDATE jobs SET status = ${status}, updated_at = now() WHERE id = ${jobId}`;
  }
}

export async function getJob(jobId: string) {
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`SELECT id, store_id as "storeId", domain, type, status, input, output, created_at as "createdAt" FROM jobs WHERE id = ${jobId}`;
  return result[0];
}

export async function listJobs(storeId: string, limit: number = 50) {
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`SELECT id, store_id as "storeId", domain, type, status, input, output, created_at as "createdAt" FROM jobs WHERE store_id = ${storeId} ORDER BY created_at DESC LIMIT ${limit}`;
  return result;
}
