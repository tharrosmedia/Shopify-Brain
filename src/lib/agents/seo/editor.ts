export async function editDraft({ storeId, draft, type = 'collection' }: { storeId: string; draft: any; type?: string }) {
  return { ...draft, type };
}
