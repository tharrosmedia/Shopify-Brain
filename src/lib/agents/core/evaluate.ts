import { generateObject } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';
import { z } from 'zod';

const EvalSchema = z.object({
  length: z.number(),
  hasFaq: z.boolean(),
  score: z.number().min(0).max(1),
  suggestions: z.array(z.string()).optional(),
});

export async function evaluate(draft: any, type = 'collection', platform?: string, brandVoice?: any, metafieldDefinitions?: any[], placement?: any, products: any[] = []) {
  const content = (draft.bodyHtml || '').slice(0, 2000);
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  const mfInfo = draft.metafields ? `metafields used: ${Object.keys(draft.metafields).length}` : 'no metafields';
  const prodInfo = products.length ? `products context: ${products.slice(0,3).map((p:any)=>p.title).join(', ')}` : '';
  try {
    const { object } = await generateObject({
      model: xai(XAI_MODEL),
      schema: EvalSchema,
      prompt: `Evaluate this ${type} draft for quality, SEO, brand voice match (${bv}). Content: ${content}. ${mfInfo}. ${prodInfo}. Return length, hasFaq, score 0-1, optional suggestions (mention metafield relevance if applicable, job-first).`,
    });
    return { ...object, type, brandVoice, platform };
  } catch {
    // fallback
    const length = (draft.bodyHtml || '').length;
    return { length, hasFaq: (draft.bodyHtml || '').toLowerCase().includes('faq'), score: 0.75, type, brandVoice, platform };
  }
}
