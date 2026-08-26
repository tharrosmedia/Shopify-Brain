import { generateObject } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';
import { z } from 'zod';

const OptimizeSchema = z.object({
  metaTitle: z.string(),
  metaDescription: z.string().optional(),
  schemaJsonLd: z.any(),
});

export async function optimizeDraft({ storeId, draft, type = 'collection', platform, brandVoice, metafieldDefinitions, placement, products = [] }: { storeId: string; draft: any; type?: string; platform?: string; brandVoice?: any; metafieldDefinitions?: any[]; placement?: any; products?: any[] }) {
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  const base = draft.title || draft.keyword || '';
  const defsStr = (metafieldDefinitions && metafieldDefinitions.length) ? 'defs available' : 'no defs';
  try {
    const { object } = await generateObject({
      model: xai(XAI_MODEL),
      schema: OptimizeSchema,
      prompt: `Optimize meta and schema for a ${type} about "${base}". Brand voice: ${bv}. Platform: ${platform}. Current title: ${base}. Selectively refine any chosen metafields if they help SEO (job-first). Products available: ${products.slice(0,3).map((p:any)=>p.title).join(', ')}. Defs: ${defsStr}. Provide improved metaTitle, metaDescription, and schemaJsonLd object with @type appropriate for ${type}.`,
    });
    return { ...draft, ...object, brandVoice, type, platform };
  } catch {
    let schemaType = 'CollectionPage';
    if (type === 'page') schemaType = 'WebPage';
    else if (type === 'blog') schemaType = 'BlogPosting';
    return { ...draft, metaTitle: base + ' | Options', metaDescription: (draft.bodyHtml || '').slice(0, 150), schemaJsonLd: { '@type': schemaType }, brandVoice, type, platform };
  }
}
