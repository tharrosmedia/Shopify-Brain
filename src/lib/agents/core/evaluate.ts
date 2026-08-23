export async function evaluate(draft: any, type = 'collection', platform?: string) {
  return { length: (draft.bodyHtml || '').length, hasFaq: true, score: 0.85, type };
}
