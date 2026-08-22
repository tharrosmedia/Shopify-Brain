import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const xai = createOpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: process.env.XAI_API_KEY! });

export async function writeDraft({ storeId, brief, type = 'collection' }: { storeId: string; brief: any; type?: string }) {
  const { text } = await generateText({
    model: xai('grok-build-0.1'),
    prompt: `Write a high quality answer-first HTML content for a Shopify ${type} about keyword "${brief.keyword}". Use this brief: ${JSON.stringify(brief)}. Include H2 sections, tables if useful, FAQs. Return only the inner HTML body content.`,
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
