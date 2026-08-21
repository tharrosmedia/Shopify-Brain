import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const xai = createOpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: process.env.XAI_API_KEY! });

export async function research({ storeId, keyword }: { storeId: string; keyword: string }) {
  const tavilyRes = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: keyword,
      max_results: 5,
      search_depth: 'basic',
    }),
  });
  const data = await tavilyRes.json();
  const { text } = await generateText({
    model: xai('grok-build-0.1'),
    prompt: `Summarize key facts, competitors, questions and angles for a product catalog page about: ${keyword}. Use this search data: ${JSON.stringify(data).slice(0, 2000)}`,
  });
  return { keyword, summary: text, raw: data };
}
