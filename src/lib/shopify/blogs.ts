

export async function getFirstBlogId(adminClient: any): Promise<string> {
  const query = `
    query getFirstBlog {
      blogs(first: 1) {
        edges {
          node {
            id
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
  return blog.id;
}

export async function createDraftArticle(adminClient: any, input: { title: string; handle?: string; bodyHtml?: string }) {
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
  return response;
}
