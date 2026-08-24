import { createAdminClient } from '../../shopify/client';
import { createAndPublishCollection } from '../../shopify/collections';
import { createAndPublishPage } from '../../shopify/pages';
import { createAndPublishArticle } from '../../shopify/blogs';
import { getStore } from '../../db/stores';
import { setMetafields } from '../../shopify/metafields';

function getSourceValue(draft: any, source: string): any {
  if (source === 'bodyHtml') return draft.bodyHtml;
  if (source === 'metaTitle') return draft.metaTitle;
  if (source === 'metaDescription') return draft.metaDescription;
  if (source === 'schemaJsonLd') return draft.schemaJsonLd;
  if (source.startsWith('metafields.')) {
    const key = source.split('.')[1];
    return draft.metafields?.[key];
  }
  return draft[source];
}

function getResourceId(response: any, type: string): string | null {
  if (type === 'page') return response?.data?.pageCreate?.page?.id || null;
  if (type === 'blog') return response?.data?.articleCreate?.article?.id || null;
  return response?.data?.collectionCreate?.collection?.id || null;
}

export async function publishContent({ storeId, draft, type = 'collection', platform }: { storeId: string; draft: any; type?: string; platform?: string }) {
  const store = await getStore(storeId);
  if (!store || !store.shopify_access_token) {
    throw new Error(`No Shopify credentials configured for store ${storeId}`);
  }
  const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
  const config = (store as any).config || {};
  const placement = config.placement?.[type] || config.placement?.default || null;
  let bodyForMain: string | undefined = draft.bodyHtml;
  let useMainBody = true;
  const mfs: Array<{namespace: string; key: string; value: string; type: string}> = [];
  if (placement) {
    const bodyRule = placement.body;
    if (bodyRule) {
      if (bodyRule.target === 'metafield' && bodyRule.metafield) {
        useMainBody = !!bodyRule.populateMain;
        if (!useMainBody) bodyForMain = undefined;
        mfs.push({
          namespace: bodyRule.metafield.namespace,
          key: bodyRule.metafield.key,
          value: draft.bodyHtml || '',
          type: bodyRule.metafield.type || 'multi_line_text_field',
        });
      }
    }
    if (placement.metafields) {
      for (const rule of placement.metafields) {
        const val = getSourceValue(draft, rule.source);
        if (val != null) {
          const v = typeof val === 'object' ? JSON.stringify(val) : String(val);
          mfs.push({
            namespace: rule.target.namespace,
            key: rule.target.key,
            value: v,
            type: rule.target.type || (rule.source === 'schemaJsonLd' ? 'json' : 'multi_line_text_field'),
          });
        }
      }
    }
  }
  const mainInput: any = {
    title: draft.title,
    handle: draft.handle,
  };
  if (useMainBody && bodyForMain !== undefined) {
    mainInput.bodyHtml = bodyForMain || '';
  } else {
    mainInput.bodyHtml = '';
  }
  let response;
  if (type === 'page') {
    response = await createAndPublishPage(client, mainInput);
  } else if (type === 'blog') {
    response = await createAndPublishArticle(client, mainInput);
  } else {
    response = await createAndPublishCollection(client, mainInput);
  }
  const ownerId = getResourceId(response, type);
  if (ownerId && mfs.length > 0) {
    await setMetafields(client, ownerId, mfs);
  }
  return response;
}

export const publishCatalogPage = publishContent;
