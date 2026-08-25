import { getFirstBlogId } from './blogs';

export async function fetchStoreSamples(adminClient: any, limit = 5) {
  const samples: Array<{ title: string; body: string }> = [];

  try {
    const shopQ = `query { shop { name description } }`;
    const shopRes = await adminClient.request(shopQ, {});
    const shop = shopRes?.data?.shop || shopRes?.shop;
    if (shop) {
      if (shop.name) samples.push({ title: 'Shop Name', body: shop.name });
      if (shop.description) samples.push({ title: 'Shop Description', body: shop.description });
    }
  } catch {}

  try {
    const prodQ = `
      query {
        products(first: ${limit}, sortKey: BEST_SELLING) {
          edges { node { title descriptionHtml productType } }
        }
      }
    `;
    const prodRes = await adminClient.request(prodQ, {});
    const prods = prodRes?.data?.products?.edges || [];
    prods.forEach((e: any) => {
      const n = e.node;
      if (n.title) samples.push({ title: n.title, body: (n.descriptionHtml || '').slice(0, 500) });
      if (n.productType) samples.push({ title: `${n.title} Type`, body: n.productType });
    });
  } catch {}

  try {
    const collQ = `
      query {
        collections(first: 3) {
          edges { node { title descriptionHtml } }
        }
      }
    `;
    const collRes = await adminClient.request(collQ, {});
    const colls = collRes?.data?.collections?.edges || [];
    colls.forEach((e: any) => {
      const n = e.node;
      if (n.title) samples.push({ title: n.title, body: (n.descriptionHtml || '').slice(0, 500) });
    });
  } catch {}

  try {
    const pageQ = `
      query {
        pages(first: 3) {
          edges { node { title body } }
        }
      }
    `;
    const pageRes = await adminClient.request(pageQ, {});
    const pages = pageRes?.data?.pages?.edges || [];
    pages.forEach((e: any) => {
      const n = e.node;
      if (n.title) samples.push({ title: n.title, body: (n.body || '').slice(0, 800) });
    });
  } catch {}

  try {
    const blogId = await getFirstBlogId(adminClient);
    const artQ = `
      query {
        blog(id: "${blogId}") {
          articles(first: 3) {
            edges { node { title bodyHtml } }
          }
        }
      }
    `;
    const artRes = await adminClient.request(artQ, {});
    const arts = artRes?.data?.blog?.articles?.edges || [];
    arts.forEach((e: any) => {
      const n = e.node;
      if (n.title) samples.push({ title: n.title, body: (n.bodyHtml || '').slice(0, 500) });
    });
  } catch {}

  return samples.slice(0, 15);
}

export async function searchBrandContext(shopDomain: string, storeName?: string) {
  if (!process.env.TAVILY_API_KEY) return { results: [] };
  const query = storeName ? `${storeName} brand voice tone style site:${shopDomain}` : `${shopDomain} brand tone writing style`;
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 5,
      search_depth: 'basic',
    }),
  });
  return await res.json();
}
