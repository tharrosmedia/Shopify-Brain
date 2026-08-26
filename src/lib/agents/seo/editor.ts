import { generateText } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';

export async function editDraft({ storeId, draft, type = 'collection', platform, brandVoice }: { storeId: string; draft: any; type?: string; platform?: string; brandVoice?: any }) {
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  const content = (draft.bodyHtml || '').slice(0, 1500);
  try {
    const { text } = await generateText({
      model: xai(XAI_MODEL),
      system: `You are an expert editor. Improve the provided ${type} content for clarity, SEO, flow and adherence to brand voice: ${bv}. Keep similar length and structure. Return only the improved body HTML.`,
      prompt: `Edit this draft for keyword context: ${draft.title || ''}. Content: ${content}`,
    });
    const cleaned = (text || draft.bodyHtml || '').trim().replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();
    return { ...draft, bodyHtml: cleaned, type, brandVoice, platform };
  } catch {
    return { ...draft, type, brandVoice, platform };
  }
}
