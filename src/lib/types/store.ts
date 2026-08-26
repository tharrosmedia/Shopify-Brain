export interface MetafieldTarget {
  namespace: string;
  key: string;
  type?: string;
}

export interface Placement {
  body?: {
    target: 'main' | 'metafield';
    metafield?: MetafieldTarget;
    populateMain?: boolean;
  };
  metafields?: Array<{
    source: string;
    target: MetafieldTarget;
  }>;
}

export interface BrandVoice {
  text: string;
  inferredAt?: string;
  samplesUsed?: number;
}

export interface Autonomy {
  allowedTypes?: Array<'collection' | 'page' | 'blog'>;
  requireApproval?: boolean;
}

export interface StoreConfig {
  placement?: Record<string, Placement>;
  brandVoice?: BrandVoice;
  autonomy?: Autonomy;
  metafieldSchema?: {
    definitions?: any[];
    samples?: any;
    lastRefreshed?: string;
  };
}

export interface Store {
  id: string;
  name: string;
  shopifyDomain: string;
  platform?: string;
  config?: StoreConfig;
}
