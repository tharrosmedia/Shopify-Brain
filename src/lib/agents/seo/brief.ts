export async function createBrief({ storeId, keyword, research, type = 'collection', platform, brandVoice }: { storeId: string; keyword: string; research: any; type?: string; platform?: string; brandVoice?: any }) {
  let sections = ['intro', 'key specs', 'comparison', 'faqs'];
  if (type === 'page') sections = ['intro', 'details', 'benefits', 'faqs'];
  else if (type === 'blog') sections = ['intro', 'tips', 'examples', 'faqs'];
  return {
    keyword,
    type,
    platform,
    brandVoice,
    intent: 'informational commercial',
    sections,
    researchSummary: research?.summary || '',
  };
}
