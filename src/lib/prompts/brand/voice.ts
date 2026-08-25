export function buildBrandVoiceMessages(samples: Array<{ title: string; body: string }>, tavilyData?: any) {
  const sampleText = samples.map(s => `${s.title}: ${s.body}`).join('\n\n').slice(0, 4000);
  const webText = tavilyData?.results ? JSON.stringify(tavilyData.results).slice(0, 1500) : '';
  const userContent = `Store samples:\n${sampleText}\n\nAdditional web context:\n${webText}\n\nProduce a concise brand voice description (2-4 sentences) covering tone, vocabulary, sentence style, personality, key themes, and writing guidelines for content.`;
  return [
    { role: 'system' as const, content: 'You are a brand strategist. Analyze the store content and web context. Output ONLY the brand voice description, no extra text or labels.' },
    { role: 'user' as const, content: userContent },
  ];
}
