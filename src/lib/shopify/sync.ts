import { getStore } from '../db/stores';
import { createAdminClient } from './client';
import { fetchProducts } from './products';
import { upsertProduct } from '../db/products';
import { writeKnowledge } from '../brain/memory';

export async function syncProductsForStore(storeId: string) {
  const store = await getStore(storeId);
  if (!store || !store.shopify_access_token) {
    throw new Error('No Shopify credentials for store');
  }
  const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
  let prods: any[] = [];
  try {
    prods = await fetchProducts(client, { includeMetafields: true });
  } catch (e) {
    console.warn('Fetch with metafields failed, retrying without:', e);
    prods = await fetchProducts(client, { includeMetafields: false });
  }
  let count = 0;
  for (const p of prods) {
    try {
      await upsertProduct(storeId, p);
      count++;
      // Also write summary to knowledge for semantic retrieve
      try {
        await writeKnowledge(storeId, `Product: ${p.title} (/${p.handle}) - ${ (p.descriptionHtml || '').slice(0,200) }`, {
          type: 'shopify_product',
          handle: p.handle,
          shopifyId: p.shopifyId,
        });
      } catch {}
    } catch (e) {
      console.warn('Failed to upsert product', p.handle, e);
    }
  }
  return { synced: count, totalFetched: prods.length };
}
