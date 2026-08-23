export const WRITER_SYSTEM_PROMPT = 'Write a high quality answer-first HTML content. Include H2 sections, tables if useful, FAQs. Return only the inner HTML body content.';

export function buildWriterUserPrompt({ brief, type = 'collection', brandVoice, platform }: { brief: any; type?: string; brandVoice?: string; platform?: string }) {
  const plat = platform || brief.platform || '';
  const p = plat ? `${plat} ` : '';
  return `for a ${p}${type} about keyword "${brief.keyword}". Use this brief: ${JSON.stringify(brief)}.`;
}

export function buildWriterMessages(args: { brief: any; type?: string; brandVoice?: string; platform?: string }) {
  const { brief, type = 'collection', platform } = args;
  const plat = platform || brief.platform || '';
  const p = plat ? `${plat} ` : '';
  return [
    { role: 'system' as const, content: `Write a high quality answer-first HTML content for a ${p}${type} about keyword "${brief.keyword}". Include H2 sections, tables if useful, FAQs. Return only the inner HTML body content.` },
    { role: 'user' as const, content: `Use this brief: ${JSON.stringify(brief)}` }
  ];
}
