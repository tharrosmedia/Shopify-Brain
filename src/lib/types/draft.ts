export interface CatalogDraft {
  title: string;
  handle: string;
  bodyHtml: string;
  metaTitle: string;
  metaDescription: string;
  metafields?: Record<string, unknown>;
  schemaJsonLd?: Record<string, unknown>;
  evaluationScores?: Record<string, number>;
}
