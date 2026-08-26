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
      prompt: `Optimize metaTitle, metaDescription and schema for a ${type} about "${base}".
Searcher intent and angles from brief/research must drive the copy.
Brand voice: ${bv}. Platform: ${platform}.
Current title: ${base}.
Products available: ${products.slice(0,3).map((p:any)=>p.title).join(', ')}. Defs: ${defsStr}.

CRITICAL for metaTitle (make it stand out in SERPs):
- Speak directly and completely to the searcher's intent.
- Adaptive: use benefit, specificity, numbers, comparison, audience, question or power words as appropriate for the topic and competition.
- Natural primary keyword placement, not stuffed. Avoid lazy patterns like just the keyword or "Keyword | Options".
- 50-60 characters ideal.

CRITICAL for metaDescription:
- Directly addresses the intent with unique value, key benefit or proof.
- Benefit-focused, clear, compelling. ~150-160 characters.
- No repetition of body text or generic filler. No keyword stuffing.
- End with a light CTA or reason to choose when natural.

Selectively refine any metafields. Provide improved metaTitle, metaDescription, and schemaJsonLd object with @type appropriate for ${type}.`,
    });
    return { ...draft, ...object, brandVoice, type, platform };
  } catch {
    let schemaType = 'CollectionPage';
    if (type === 'page') schemaType = 'WebPage';
    else if (type === 'blog') schemaType = 'BlogPosting';
    return { ...draft, metaTitle: base + ' | Options', metaDescription: (draft.bodyHtml || '').slice(0, 150), schemaJsonLd: { '@type': schemaType }, brandVoice, type, platform };
  }
}
