export async function evaluate(draft: any, type = 'collection', platform?: string, brandVoice?: any) {
  return { length: (draft.bodyHtml || '').length, hasFaq: true, score: 0.85, type, brandVoice };
}
