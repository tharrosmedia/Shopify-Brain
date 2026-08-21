import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const xai = createOpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: process.env.XAI_API_KEY! });

export async function writeDraft({ storeId, brief }: { storeId: string; brief: any }) {
  const { text } = await generateText({
    model: xai('grok-build-0.1'),
    prompt: `Write a high quality answer-first HTML catalog page for keyword "${brief.keyword}". Use this brief: ${JSON.stringify(brief)}. Include H2 sections, tables if useful, FAQs. Return only the inner HTML body content.`,
  });
  return {
    title: brief.keyword + ' | Catalog',
    handle: brief.keyword.toLowerCase().replace(/\s+/g, '-'),
    bodyHtml: text,
    metaTitle: brief.keyword,
    metaDescription: text.slice(0, 150),
  };
}
