import { generateText } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';
import { buildResearchMessages } from '../../prompts/seo/research';

export async function research({ storeId, keyword, type = 'collection', platform }: { storeId: string; keyword: string; type?: string; platform?: string }) {
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
  const allMsgs = buildResearchMessages({ keyword, type, searchData: data, platform });
  const sys = allMsgs.find(m => m.role === 'system')?.content;
  const userMsgs = allMsgs.filter(m => m.role !== 'system');
  const { text } = await generateText({
    model: xai(XAI_MODEL),
    system: sys,
    messages: userMsgs,
  });
  return { keyword, summary: text, raw: data, type };
}
