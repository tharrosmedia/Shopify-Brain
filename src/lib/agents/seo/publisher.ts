import { createAdminClient } from '../../shopify/client';
import { createDraftCollection } from '../../shopify/collections';

export async function publishCatalogPage({ storeId, draft }: { storeId: string; draft: any }) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN!;
  const token = process.env.SHOPIFY_ACCESS_TOKEN!;
  const client = createAdminClient(domain, token);
  return createDraftCollection(client, {
    title: draft.title,
    handle: draft.handle,
    bodyHtml: draft.bodyHtml,
  });
}
