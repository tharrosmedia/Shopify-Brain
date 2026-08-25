

export async function getFirstBlog(adminClient: any): Promise<{ id: string; handle: string }> {
  const query = `
    query getFirstBlog {
      blogs(first: 1) {
        edges {
          node {
            id
            handle
          }
        }
      }
    }
  `;
  const response = await adminClient.request(query, {});
  const blog = response?.data?.blogs?.edges?.[0]?.node;
  if (!blog?.id) {
    throw new Error('No blogs found in this Shopify store. Create at least one blog to publish blog posts.');
  }
  return { id: blog.id, handle: blog.handle || 'news' };
}

export async function getFirstBlogId(adminClient: any): Promise<string> {
  const blog = await getFirstBlog(adminClient);
  return blog.id;
}

import { getOnlineStorePublicationId, publishResource } from './publications';

export async function createAndPublishArticle(adminClient: any, input: { title: string; handle?: string; bodyHtml?: string }) {
  const blogId = await getFirstBlogId(adminClient);
  const mutation = `
    mutation createArticle($article: ArticleInput!, $blog: ArticleBlogInput!) {
      articleCreate(article: $article, blog: $blog) {
        article { id handle }
        userErrors { field message }
      }
    }
  `;
  const variables = {
    article: {
      title: input.title,
      handle: input.handle,
      bodyHtml: input.bodyHtml || '',
    },
    blog: {
      id: blogId,
    },
  };
  const response = await adminClient.request(mutation, { variables });
  const errors = response?.data?.articleCreate?.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((e: any) => e.message).join('; '));
  }
  const article = response?.data?.articleCreate?.article;
  if (!article?.id) {
    throw new Error('Failed to create article');
  }
  const pubId = await getOnlineStorePublicationId(adminClient);
  await publishResource(adminClient, article.id, pubId);
  return response;
}

// Back-compat alias
export const createDraftArticle = createAndPublishArticle;
