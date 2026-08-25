export async function editDraft({ storeId, draft, type = 'collection', platform, brandVoice }: { storeId: string; draft: any; type?: string; platform?: string; brandVoice?: any }) {
  return { ...draft, type, brandVoice };
}
