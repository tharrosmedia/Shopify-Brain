import { getOnlineStorePublicationId, publishResource } from './publications';

export async function createAndPublishCollection(adminClient: any, input: { title: string; handle?: string; bodyHtml?: string; }) {
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
  const errors = response?.data?.collectionCreate?.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((e: any) => e.message).join('; '));
  }
  const collection = response?.data?.collectionCreate?.collection;
  if (!collection?.id) {
    throw new Error('Failed to create collection');
  }
  const pubId = await getOnlineStorePublicationId(adminClient);
  await publishResource(adminClient, collection.id, pubId);
  return response;
}

// Back-compat alias (used by tests and older references)
export const createDraftCollection = createAndPublishCollection;
