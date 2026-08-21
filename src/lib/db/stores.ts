import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

export async function listStores() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql`SELECT id, name, shopify_domain, created_at FROM stores ORDER BY created_at DESC`;
}

export async function getStore(id: string) {
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`SELECT id, name, shopify_domain, shopify_access_token FROM stores WHERE id = ${id}`;
  return result[0];
}

export async function createStore({ name, shopify_domain, shopify_access_token }: { name: string; shopify_domain: string; shopify_access_token: string }) {
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`INSERT INTO stores (name, shopify_domain, shopify_access_token) VALUES (${name}, ${shopify_domain}, ${shopify_access_token}) RETURNING id, name, shopify_domain, created_at`;
  return result[0];
}

export async function updateStore(id: string, { name, shopify_domain, shopify_access_token }: { name: string; shopify_domain: string; shopify_access_token: string }) {
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`UPDATE stores SET name = ${name}, shopify_domain = ${shopify_domain}, shopify_access_token = ${shopify_access_token}, updated_at = now() WHERE id = ${id} RETURNING id, name, shopify_domain, created_at`;
  return result[0];
}
