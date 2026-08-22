import { createAdminClient } from '../../shopify/client';
import { createAndPublishCollection } from '../../shopify/collections';
import { createAndPublishPage } from '../../shopify/pages';
import { createAndPublishArticle } from '../../shopify/blogs';
import { getStore } from '../../db/stores';

export async function publishContent({ storeId, draft, type = 'collection' }: { storeId: string; draft: any; type?: string }) {
  const store = await getStore(storeId);
  if (!store || !store.shopify_access_token) {
    throw new Error(`No Shopify credentials configured for store ${storeId}`);
  }
  const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
  if (type === 'page') {
    return createAndPublishPage(client, {
      title: draft.title,
      handle: draft.handle,
      bodyHtml: draft.bodyHtml,
    });
  }
  if (type === 'blog') {
    return createAndPublishArticle(client, {
      title: draft.title,
      handle: draft.handle,
      bodyHtml: draft.bodyHtml,
    });
  }
  // default collection
  return createAndPublishCollection(client, {
    title: draft.title,
    handle: draft.handle,
    bodyHtml: draft.bodyHtml,
  });
}

// backward compat alias
export const publishCatalogPage = publishContent;
