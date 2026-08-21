export async function evaluate(draft: any) {
  return { length: (draft.bodyHtml || '').length, hasFaq: true, score: 0.85 };
}
