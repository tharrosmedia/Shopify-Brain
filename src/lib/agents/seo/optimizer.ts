export async function optimizeDraft({ storeId, draft }: { storeId: string; draft: any }) {
  return { ...draft, metaTitle: draft.title + ' | Best Options', schemaJsonLd: { '@type': 'CollectionPage' } };
}
