import { createAdminClient } from '../../shopify/client';
import { createAndPublishCollection, addProductsToCollection, setCollectionRules } from '../../shopify/collections';
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
    const key = source.replace(/^metafields\./, '');
    return draft.metafields?.[key];
  }
  return draft[source];
}

function getResourceId(response: any, type: string): string | null {
  if (type === 'page') return response?.data?.pageCreate?.page?.id || response?.data?.pageUpdate?.page?.id || null;
  if (type === 'blog') return response?.data?.articleCreate?.article?.id || null;
  return response?.data?.collectionCreate?.collection?.id || null;
}

export async function publishContent({ storeId, draft, type = 'collection', platform, brandVoice, products = [] }: { storeId: string; draft: any; type?: string; platform?: string; brandVoice?: any; products?: any[] }) {
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

  // Auto-set any metafields the agent produced (supports agent-created keys + "namespace.key"; best for agent)
  for (const [fullKey, val] of Object.entries(draft.metafields || {})) {
    if (val == null) continue;
    let ns = 'custom';
    let k = fullKey;
    if (fullKey.includes('.')) {
      const parts = fullKey.split('.');
      ns = parts[0];
      k = parts.slice(1).join('.');
    }
    const already = mfs.some((m: any) => m.namespace === ns && m.key === k);
    if (!already) {
      const v = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const t = v.includes('<') || v.includes('</') ? 'multi_line_text_field' : 'single_line_text_field';
      mfs.push({ namespace: ns, key: k, value: v, type: t });
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
    // try update existing by handle
    let updated = false;
    if (mainInput.handle) {
      try {
        const findQ = `query { pages(first:1, query:"handle:${mainInput.handle}") { edges { node { id } } } }`;
        const findRes = await client.request(findQ, {});
        const existing = findRes?.data?.pages?.edges?.[0]?.node;
        if (existing?.id) {
          const { updatePage } = await import('../../shopify/pages');
          response = await updatePage(client, existing.id, mainInput);
          updated = true;
        }
      } catch {}
    }
    if (!updated) {
      response = await createAndPublishPage(client, mainInput);
    }
  } else if (type === 'blog') {
    response = await createAndPublishArticle(client, mainInput);
  } else {
    response = await createAndPublishCollection(client, mainInput);
  }
  const ownerId = getResourceId(response, type);
  if (ownerId && mfs.length > 0) {
    await setMetafields(client, ownerId, mfs);
  }

  // Handle products for collections (configurable via placement.collection.products)
  if (type === 'collection' && ownerId && products.length > 0) {
    const collPlacement = placement?.collection || placement?.default || {};
    const prodCfg = collPlacement.products || {};
    const mode = prodCfg.mode || 'rules'; // 'rules' | 'manual'
    const auto = prodCfg.auto !== false; // default true
    if (auto) {
      try {
        const prodIds = products.slice(0, 10).map((p: any) => p.shopifyId).filter(Boolean);
        if (mode === 'manual' && prodIds.length) {
          await addProductsToCollection(client, ownerId, prodIds);
        } else if (mode === 'rules') {
          // simple rule based on keyword from draft or first products
          const handles = products.slice(0, 5).map((p: any) => p.handle).filter(Boolean);
          await setCollectionRules(client, ownerId, handles);
        }
      } catch (e) {
        console.warn('[PUBLISH] product add to collection failed', e);
      }
    }
  }
  return response;
}

export const publishCatalogPage = publishContent;
