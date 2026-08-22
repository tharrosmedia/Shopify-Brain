import { createAdminClient } from '../../shopify/client';
import { createDraftCollection } from '../../shopify/collections';
import { createDraftPage } from '../../shopify/pages';
import { createDraftArticle } from '../../shopify/blogs';
import { getStore } from '../../db/stores';

export async function publishContent({ storeId, draft, type = 'collection' }: { storeId: string; draft: any; type?: string }) {
  const store = await getStore(storeId);
  if (!store || !store.shopify_access_token) {
    throw new Error(`No Shopify credentials configured for store ${storeId}`);
  }
  const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
  if (type === 'page') {
    return createDraftPage(client, {
      title: draft.title,
      handle: draft.handle,
      bodyHtml: draft.bodyHtml,
    });
  }
  if (type === 'blog') {
    return createDraftArticle(client, {
      title: draft.title,
      handle: draft.handle,
      bodyHtml: draft.bodyHtml,
    });
  }
  // default collection
  return createDraftCollection(client, {
    title: draft.title,
    handle: draft.handle,
    bodyHtml: draft.bodyHtml,
  });
}

// backward compat alias
export const publishCatalogPage = publishContent;
