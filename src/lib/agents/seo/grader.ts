import { generateObject } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';
import { z } from 'zod';

const GradeSchema = z.object({
  score: z.number().min(0).max(10),
  suggestions: z.array(z.string()).optional(),
  titleFeedback: z.string().optional(),
  metaDescriptionFeedback: z.string().optional(),
  contentFeedback: z.string().optional(),
  metafieldFeedback: z.string().optional(),
  productFeedback: z.string().optional(),
});

export async function gradeDraft({
  draft,
  type = 'collection',
  platform,
  brandVoice,
  metafieldDefinitions = [],
  placement,
  products = [],
  brief,
  research,
}: {
  draft: any;
  type?: string;
  platform?: string;
  brandVoice?: any;
  metafieldDefinitions?: any[];
  placement?: any;
  products?: any[];
  brief?: any;
  research?: any;
}) {
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  const intent = brief?.intent || (research && research.summary ? research.summary.slice(0, 500) : '');
  const researchSum = research?.summary || brief?.researchSummary || '';
  const content = (draft.bodyHtml || '').slice(0, 1800);
  const metaT = draft.metaTitle || '';
  const metaD = draft.metaDescription || '';
  const mfs = draft.metafields ? Object.entries(draft.metafields).map(([k, v]) => `${k}: ${(String(v) || '').slice(0, 120)}`).join(' | ') : 'none';
  const defsStr = (metafieldDefinitions && metafieldDefinitions.length)
    ? JSON.stringify(metafieldDefinitions.map((d: any) => ({ namespace: d.namespace, key: d.key, name: d.name, type: d.type?.name, description: d.description })))
    : 'none';
  const prods = products.length ? products.slice(0, 6).map((p: any) => `${p.title} (/${p.handle})`).join('; ') : 'none';

  const prompt = `You are an expert SEO grader and editor coach. Grade this ${type} draft on a 0-10 scale (8.5+ is required before human approval).

Searcher intent: ${intent}
Research summary: ${researchSum}
Brand voice: ${bv}
Platform: ${platform || ''}

Current draft:
title: ${draft.title || ''}
handle: ${draft.handle || ''}
metaTitle: ${metaT}
metaDescription: ${metaD}
bodyHtml (first 1800 chars): ${content}
metafields used: ${mfs}
Available metafield defs: ${defsStr}
Available products for this job: ${prods}

Evaluation criteria (be strict):
- metaTitle: Does it stand out in SERPs for the exact intent? Attention-grabbing, benefit/specificity/curiosity oriented, primary keyword natural, not lazy like just the keyword or "Keyword | Options". Adaptive to competition.
- metaDescription: Addresses searcher intent directly, unique value, benefit-focused, ~150-160 chars, no repetition of body or keyword stuffing, compelling.
- Content quality: Clean structure (headings, lists), no walls of repetitive text, flows well, uses products naturally, helpful for user.
- Metafield utilization: When relevant COLLECTION/PAGE defs exist (e.g. FAQ fields), are they populated with distinct useful values instead of dumping everything in body?
- Product integration: Real products from context are referenced or recommended where it makes sense (for collections especially).
- Overall SEO, brand voice match, usefulness.

Return score (0-10), 3-8 specific actionable suggestions, plus short feedback strings for title, metaDescription, content, metafields, products.`;

  try {
    const { object } = await generateObject({
      model: xai(XAI_MODEL),
      schema: GradeSchema,
      prompt,
    });
    return { ...object, type, platform, brandVoice };
  } catch {
    // fallback - conservative
    const hasMetaT = !!(draft.metaTitle && draft.metaTitle.length > 10);
    const hasMetaD = !!(draft.metaDescription && draft.metaDescription.length > 30);
    let score = 5.0;
    if (hasMetaT && hasMetaD) score = 6.5;
    const length = (draft.bodyHtml || '').length;
    if (length > 400) score += 1;
    return {
      score: Math.min(7, Math.max(4, score)),
      suggestions: ['Improve metaTitle to speak directly to searcher intent and stand out', 'Populate relevant metafields (FAQs etc.) instead of long body text', 'Reference specific products from context'],
      titleFeedback: hasMetaT ? 'Basic title present' : 'Lazy or missing title',
      metaDescriptionFeedback: hasMetaD ? 'Basic description' : 'Too short or generic',
      contentFeedback: 'Review for repetition and structure',
      metafieldFeedback: 'Check if available structured fields were used',
      productFeedback: 'Consider adding real product mentions',
      type,
      platform,
      brandVoice,
    };
  }
}
