import { generateObject } from 'ai';
import { z } from 'zod';
import { xai, XAI_MODEL } from '../../ai/xai';

export async function writeDraft({ storeId, brief, type = 'collection', platform, brandVoice, metafieldDefinitions, placement, products = [] }: { storeId: string; brief: any; type?: string; platform?: string; brandVoice?: any; metafieldDefinitions?: any[]; placement?: any; products?: any[] }) {
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  const bvPart = bv ? ` Follow this brand voice: ${bv}.` : '';
  const plat = platform || brief.platform || '';
  const p = plat ? `${plat} ` : '';

  const defsStr = (metafieldDefinitions && metafieldDefinitions.length)
    ? JSON.stringify(metafieldDefinitions.map((d: any) => ({ namespace: d.namespace, key: d.key, name: d.name, type: d.type?.name, description: d.description })))
    : 'none';

  const placementStr = placement ? JSON.stringify(placement) : 'default';
  const productsStr = products.length ? JSON.stringify(products.slice(0, 8).map((p: any) => ({ title: p.title, handle: p.handle, desc: (p.descriptionHtml || '').slice(0, 100) }))) : 'none';

  const prompt = `Create high-quality SEO content for a ${p}${type} about keyword "${brief.keyword}".${bvPart}
Primary goal: best SEO for this exact keyword and job.
Store placement: ${placementStr}
Available products (use for recommendations, include in collection, link in content): ${productsStr}
Available metafield definitions (use SELECTIVELY only the ones that help this specific keyword/job for best SEO; you do NOT have to use all or any. It is fine to use a subset e.g. 4 out of 8. When inventing new, supply full "namespace.key" name yourself):
${defsStr}
Use this brief: ${JSON.stringify(brief)}

For metaTitle: make it stand out on SERP for the searcher intent in the brief. Adaptive, benefit/specific/curiosity driven, natural keyword, ~50-60 chars. No lazy titles.
For metaDescription: speak directly to intent, benefit-focused, compelling, non-repetitive, ~155 chars.
Return structured content. For metafields use exact "namespace.key" keys. Body and chosen metas must not duplicate content. Reference real product titles/handles where they fit naturally.`;

  const { object } = await generateObject({
    model: xai(XAI_MODEL),
    schema: z.object({
      title: z.string(),
      handle: z.string(),
      bodyHtml: z.string(),
      metaTitle: z.string(),
      metaDescription: z.string(),
      metafields: z.record(z.string(), z.string()).optional(),
    }),
    prompt,
  });

  return {
    ...object,
    type,
    brandVoice,
    platform,
  };
}
