export const RESEARCH_SYSTEM_PROMPT = 'Summarize key facts, competitors, questions and angles for a Shopify content.';

export function buildResearchUserPrompt({ keyword, type = 'collection', searchData, brandVoice }: { keyword: string; type?: string; searchData: any; brandVoice?: string }) {
  const dataStr = JSON.stringify(searchData).slice(0, 2000);
  return `Use this search data: ${dataStr}`;
}

export function buildResearchMessages(args: { keyword: string; type?: string; searchData: any; brandVoice?: string }) {
  const { keyword, type = 'collection', searchData } = args;
  const dataStr = JSON.stringify(searchData).slice(0, 2000);
  return [
    { role: 'system' as const, content: `Summarize key facts, competitors, questions and angles for a Shopify ${type} about: ${keyword}.` },
    { role: 'user' as const, content: `Use this search data: ${dataStr}` }
  ];
}
