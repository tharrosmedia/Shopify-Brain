import { generateObject } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';
import { z } from 'zod';

const BriefSchema = z.object({
  intent: z.string(),
  sections: z.array(z.string()),
  researchSummary: z.string(),
});

export async function createBrief({ storeId, keyword, research, type = 'collection', platform, brandVoice, metafieldDefinitions, placement }: { storeId: string; keyword: string; research: any; type?: string; platform?: string; brandVoice?: any; metafieldDefinitions?: any[]; placement?: any }) {
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  const researchSum = research?.summary || '';
  const defsStr = (metafieldDefinitions && metafieldDefinitions.length) ? JSON.stringify(metafieldDefinitions.map((d: any) => ({ namespace: d.namespace, key: d.key, name: d.name, type: d.type?.name }))) : 'none';
  const placementStr = placement ? JSON.stringify(placement) : 'default';
  try {
    const { object } = await generateObject({
      model: xai(XAI_MODEL),
      schema: BriefSchema,
      prompt: `Create a content brief for a ${type} on "${keyword}". Research: ${researchSum}. Brand voice: ${bv}. Platform: ${platform}. Placement: ${placementStr}. Available metafields (use selectively for best SEO on this keyword; subset OK): ${defsStr}. Provide intent, list of 3-5 sections, and refined researchSummary.`,
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
      intent: 'informational commercial',
      sections,
      researchSummary: researchSum,
    };
  }
}
