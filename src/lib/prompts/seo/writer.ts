export const WRITER_SYSTEM_PROMPT = 'Write a high quality answer-first HTML content. Include H2 sections, tables if useful, FAQs. Return only the inner HTML body content.';

export function buildWriterUserPrompt({ brief, type = 'collection', brandVoice }: { brief: any; type?: string; brandVoice?: string }) {
  return `for a Shopify ${type} about keyword "${brief.keyword}". Use this brief: ${JSON.stringify(brief)}.`;
}

export function buildWriterMessages(args: { brief: any; type?: string; brandVoice?: string }) {
  const { brief, type = 'collection' } = args;
  return [
    { role: 'system' as const, content: `Write a high quality answer-first HTML content for a Shopify ${type} about keyword "${brief.keyword}". Include H2 sections, tables if useful, FAQs. Return only the inner HTML body content.` },
    { role: 'user' as const, content: `Use this brief: ${JSON.stringify(brief)}` }
  ];
}
