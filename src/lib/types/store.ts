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

export interface StoreConfig {
  placement?: Record<string, Placement>;
}

export interface Store {
  id: string;
  name: string;
  shopifyDomain: string;
  platform?: string;
  config?: StoreConfig;
}
