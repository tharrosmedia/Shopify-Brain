export async function createDraftPage(adminClient: any, input: { title: string; handle?: string; bodyHtml?: string }) {
  const mutation = `
    mutation createPage($input: PageInput!) {
      pageCreate(input: $input) {
        page { id handle }
        userErrors { field message }
      }
    }
  `;
  const variables = {
    input: {
      title: input.title,
      handle: input.handle,
      body: input.bodyHtml || '',
    },
  };
  const response = await adminClient.request(mutation, { variables });
  return response;
}
