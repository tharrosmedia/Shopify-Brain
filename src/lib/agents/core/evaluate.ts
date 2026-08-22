export async function evaluate(draft: any, type = 'collection') {
  return { length: (draft.bodyHtml || '').length, hasFaq: true, score: 0.85, type };
}
