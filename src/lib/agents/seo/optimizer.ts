export async function optimizeDraft({ storeId, draft, type = 'collection', platform }: { storeId: string; draft: any; type?: string; platform?: string }) {
  let schemaType = 'CollectionPage';
  if (type === 'page') schemaType = 'WebPage';
  else if (type === 'blog') schemaType = 'BlogPosting';
  return { ...draft, metaTitle: draft.title + ' | Best Options', schemaJsonLd: { '@type': schemaType } };
}
