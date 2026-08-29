import { generateObject } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';
import { z } from 'zod';

const BriefSchema = z.object({
  primaryKeyword: z.string().optional(),
  intent: z.string(),
  mustCover: z.array(z.string()).optional(),
  mustNotCover: z.array(z.string()).optional(),
  sectionOutline: z.array(z.object({ heading: z.string(), bullets: z.array(z.string()).optional() })).optional(),
  toneNotes: z.string().optional(),
  researchSummary: z.string(),
  metafieldPlan: z.array(z.object({ namespace: z.string(), key: z.string(), type: z.string().optional(), reason: z.string().optional() })).optional(),
  productPlan: z.object({ mode: z.enum(['manual','rules']).optional(), maxProducts: z.number().optional() }).optional(),
});

export async function createBrief({ storeId, keyword, research, type = 'collection', platform, brandVoice, seoRules, metafieldDefinitions, placement, products = [], metafieldSamples = [] }: { storeId: string; keyword: string; research: any; type?: string; platform?: string; brandVoice?: any; seoRules?: any; metafieldDefinitions?: any[]; placement?: any; products?: any[]; metafieldSamples?: any[] }) {
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  const researchSum = research?.summary || '';
  const defsStr = (metafieldDefinitions && metafieldDefinitions.length) ? JSON.stringify(metafieldDefinitions.map((d: any) => ({ namespace: d.namespace, key: d.key, name: d.name, type: d.type?.name }))) : 'none';
  const samplesStr = (metafieldSamples && metafieldSamples.length) ? JSON.stringify(metafieldSamples.slice(0,2)).slice(0,800) : 'none';
  const placementStr = placement ? JSON.stringify(placement) : 'default';
  const productsStr = products.length ? `Relevant products: ${products.slice(0,5).map((p: any) => p.title + '(/' + p.handle + ')').join(', ')}` : 'none';
  try {
    const { object } = await generateObject({
      model: xai(XAI_MODEL),
      schema: BriefSchema,
      prompt: `Create a detailed content brief for a ${type} on "${keyword}". Research: ${researchSum}. Brand voice: ${bv}. Platform: ${platform}. Placement: ${placementStr}. Products: ${productsStr}. Available metafields (use selectively; plan which to populate): ${defsStr}. Sample values: ${samplesStr}. 
Include: primaryKeyword, intent, mustCover (key points), mustNotCover (off-topic), sectionOutline (3-6 with optional bullets), toneNotes, refined researchSummary, optional metafieldPlan (array of {namespace,key,type,reason}), optional productPlan.
Use real products for recommendations and collections. Focus on topic for the keyword.`,
    });
    return {
      keyword,
      type,
      platform,
      brandVoice,
      ...object,
    };
  } catch {
    let sections = ['intro', 'key specs', 'comparison', 'faqs'];
    if (type === 'page') sections = ['intro', 'details', 'benefits', 'faqs'];
    else if (type === 'blog') sections = ['intro', 'tips', 'examples', 'faqs'];
    return {
      keyword,
      type,
      platform,
      brandVoice,
      primaryKeyword: keyword,
      intent: 'informational commercial',
      mustCover: [],
      mustNotCover: [],
      sectionOutline: sections.map(s => ({heading: s})),
      researchSummary: researchSum,
      metafieldPlan: [],
      productPlan: { mode: 'manual' },
    };
  }
}
