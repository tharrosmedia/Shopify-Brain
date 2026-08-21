import { createAdminClient } from '../../shopify/client';
import { createDraftCollection } from '../../shopify/collections';
import { getStore } from '../../db/stores';

export async function publishCatalogPage({ storeId, draft }: { storeId: string; draft: any }) {
  const store = await getStore(storeId);
  if (!store || !store.shopify_access_token) {
    throw new Error(`No Shopify credentials configured for store ${storeId}`);
  }
  const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
  return createDraftCollection(client, {
    title: draft.title,
    handle: draft.handle,
    bodyHtml: draft.bodyHtml,
  });
}
