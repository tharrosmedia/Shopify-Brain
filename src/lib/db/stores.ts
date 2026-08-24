import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { encrypt, decrypt } from '../encryption';

export async function listStores() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql`SELECT id, name, shopify_domain, platform, config, created_at FROM stores ORDER BY created_at DESC`;
}

export async function getStore(id: string) {
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`SELECT id, name, shopify_domain, shopify_access_token, platform, config FROM stores WHERE id = ${id}`;
  const row = result[0];
  if (row && row.shopify_access_token) {
    try {
      row.shopify_access_token = decrypt(row.shopify_access_token, process.env.ENCRYPTION_KEY!);
    } catch (e) {
      // If decryption fails (e.g. old plaintext or bad key), keep as-is or throw in prod
      console.warn('Failed to decrypt token for store', id, '— may be plaintext or wrong key');
    }
  }
  return row;
}

export async function createStore({ name, shopify_domain, shopify_access_token, platform = 'shopify', config }: { name: string; shopify_domain: string; shopify_access_token: string; platform?: string; config?: any }) {
  const sql = neon(process.env.DATABASE_URL!);
  const encryptedToken = encrypt(shopify_access_token, process.env.ENCRYPTION_KEY!);
  const result = await sql`INSERT INTO stores (name, shopify_domain, shopify_access_token, platform, config) VALUES (${name}, ${shopify_domain}, ${encryptedToken}, ${platform}, ${config || null}) RETURNING id, name, shopify_domain, platform, config, created_at`;
  return result[0];
}

export async function updateStore(id: string, { name, shopify_domain, shopify_access_token, platform = 'shopify', config }: { name: string; shopify_domain: string; shopify_access_token: string; platform?: string; config?: any }) {
  const sql = neon(process.env.DATABASE_URL!);
  if (shopify_access_token && shopify_access_token.length > 0) {
    const encrypted = encrypt(shopify_access_token, process.env.ENCRYPTION_KEY!);
    const result = await sql`UPDATE stores SET name = ${name}, shopify_domain = ${shopify_domain}, shopify_access_token = ${encrypted}, platform = ${platform}, config = ${config !== undefined ? config : null}, updated_at = now() WHERE id = ${id} RETURNING id, name, shopify_domain, platform, config, created_at`;
    return result[0];
  } else {
    const result = await sql`UPDATE stores SET name = ${name}, shopify_domain = ${shopify_domain}, platform = ${platform}, config = ${config !== undefined ? config : null}, updated_at = now() WHERE id = ${id} RETURNING id, name, shopify_domain, platform, config, created_at`;
    return result[0];
  }
}
