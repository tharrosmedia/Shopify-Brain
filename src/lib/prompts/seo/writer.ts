export const WRITER_SYSTEM_PROMPT = 'Write high-quality SEO content for the keyword/job. Use available metafields selectively (job-first, not all fields required). Return structured output.';

export function buildWriterUserPrompt({ brief, type = 'collection', brandVoice, platform }: { brief: any; type?: string; brandVoice?: any; platform?: string }) {
  const plat = platform || brief.platform || '';
  const p = plat ? `${plat} ` : '';
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  return `for a ${p}${type} about keyword "${brief.keyword}".${bv ? ' Brand voice: ' + bv + '.' : ''} Use this brief: ${JSON.stringify(brief)}. Primary goal: best SEO for this keyword. Use metafields selectively.`;
}

export function buildWriterMessages(args: { brief: any; type?: string; brandVoice?: any; platform?: string }) {
  const { brief, type = 'collection', brandVoice, platform } = args;
  const plat = platform || brief.platform || '';
  const p = plat ? `${plat} ` : '';
  const bv = brandVoice ? (typeof brandVoice === 'string' ? brandVoice : brandVoice.text || '') : '';
  const bvPart = bv ? ` Follow this brand voice: ${bv}.` : '';
  return [
    { role: 'system' as const, content: `Write high-quality SEO content for a ${p}${type} about keyword "${brief.keyword}".${bvPart} Use available metafield defs and placement selectively (only what helps this job/keyword for best SEO; subset or invented "namespace.key" OK; no duplication). Full store schema (all types) is in knowledge for context; focus on relevant for this job. Use real products from context for recommendations and collections.` },
    { role: 'user' as const, content: `Use this brief: ${JSON.stringify(brief)}` }
  ];
}
