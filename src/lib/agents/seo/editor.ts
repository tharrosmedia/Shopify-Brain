export async function editDraft({ storeId, draft, type = 'collection', platform }: { storeId: string; draft: any; type?: string; platform?: string }) {
  return { ...draft, type };
}
