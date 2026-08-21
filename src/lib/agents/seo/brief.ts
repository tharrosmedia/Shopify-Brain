export async function createBrief({ storeId, keyword, research }: { storeId: string; keyword: string; research: any }) {
  return {
    keyword,
    intent: 'informational commercial',
    sections: ['intro', 'key specs', 'comparison', 'faqs'],
    researchSummary: research.summary,
  };
}
