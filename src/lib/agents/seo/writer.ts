import { generateText } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';
import { buildWriterMessages } from '../../prompts/seo/writer';

export async function writeDraft({ storeId, brief, type = 'collection', platform }: { storeId: string; brief: any; type?: string; platform?: string }) {
  const allMsgs = buildWriterMessages({ brief, type, platform });
  const sys = allMsgs.find(m => m.role === 'system')?.content;
  const userMsgs = allMsgs.filter(m => m.role !== 'system');
  const { text } = await generateText({
    model: xai(XAI_MODEL),
    system: sys,
    messages: userMsgs,
  });
  let cleaned = (text || '').trim();
  // Strip common LLM markdown code fences for HTML
  cleaned = cleaned.replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();
  const suffix = type === 'collection' ? ' | Collection' : type === 'page' ? ' | Page' : ' | Blog';
  return {
    title: brief.keyword + suffix,
    handle: brief.keyword.toLowerCase().replace(/\s+/g, '-'),
    bodyHtml: cleaned,
    metaTitle: brief.keyword,
    metaDescription: cleaned.slice(0, 150),
    type,
  };
}
