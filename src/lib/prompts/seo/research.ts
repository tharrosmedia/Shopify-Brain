export const RESEARCH_SYSTEM_PROMPT = 'Summarize key facts, competitors, questions and angles for content.';

export function buildResearchUserPrompt({ keyword, type = 'collection', searchData, brandVoice, platform }: { keyword: string; type?: string; searchData: any; brandVoice?: string; platform?: string }) {
  const dataStr = JSON.stringify(searchData).slice(0, 2000);
  return `Use this search data: ${dataStr}`;
}

export function buildResearchMessages(args: { keyword: string; type?: string; searchData: any; brandVoice?: string; platform?: string }) {
  const { keyword, type = 'collection', searchData, platform } = args;
  const dataStr = JSON.stringify(searchData).slice(0, 2000);
  const plat = platform ? `${platform} ` : '';
  return [
    { role: 'system' as const, content: `Summarize key facts, competitors, questions and angles for a ${plat}${type} about: ${keyword}.` },
    { role: 'user' as const, content: `Use this search data: ${dataStr}` }
  ];
}
