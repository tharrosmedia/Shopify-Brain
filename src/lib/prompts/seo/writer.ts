export const WRITER_SYSTEM_PROMPT = 'Write a high quality answer-first HTML content. Include H2 sections, tables if useful, FAQs. Return only the inner HTML body content.';

export function buildWriterUserPrompt({ brief, type = 'collection', brandVoice, platform }: { brief: any; type?: string; brandVoice?: any; platform?: string }) {
  const plat = platform || brief.platform || '';
  const p = plat ? `${plat} ` : '';
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  return `for a ${p}${type} about keyword "${brief.keyword}".${bv ? ' Brand voice: ' + bv + '.' : ''} Use this brief: ${JSON.stringify(brief)}.`;
}

export function buildWriterMessages(args: { brief: any; type?: string; brandVoice?: any; platform?: string }) {
  const { brief, type = 'collection', brandVoice, platform } = args;
  const plat = platform || brief.platform || '';
  const p = plat ? `${plat} ` : '';
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  const bvPart = bv ? ` Follow this brand voice: ${bv}.` : '';
  return [
    { role: 'system' as const, content: `Write a high quality answer-first HTML content for a ${p}${type} about keyword "${brief.keyword}".${bvPart} Include H2 sections, tables if useful, FAQs. Return only the inner HTML body content.` },
    { role: 'user' as const, content: `Use this brief: ${JSON.stringify(brief)}` }
  ];
}
