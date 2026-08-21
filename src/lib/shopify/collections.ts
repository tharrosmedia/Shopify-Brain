export async function createDraftCollection(adminClient: any, input: { title: string; handle?: string; bodyHtml?: string; }) {
  const mutation = `
    mutation createCollection($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection { id handle }
        userErrors { field message }
      }
    }
  `;
  const variables = {
    input: {
      title: input.title,
      handle: input.handle,
      descriptionHtml: input.bodyHtml || '',
    },
  };
  const response = await adminClient.request(mutation, { variables });
  return response;
}
