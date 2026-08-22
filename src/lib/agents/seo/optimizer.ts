export async function optimizeDraft({ storeId, draft, type = 'collection' }: { storeId: string; draft: any; type?: string }) {
  let schemaType = 'CollectionPage';
  if (type === 'page') schemaType = 'WebPage';
  else if (type === 'blog') schemaType = 'BlogPosting';
  return { ...draft, metaTitle: draft.title + ' | Best Options', schemaJsonLd: { '@type': schemaType } };
}
