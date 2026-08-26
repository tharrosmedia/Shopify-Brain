CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  shopify_id text NOT NULL,
  title text,
  handle text,
  description_html text,
  image_url text,
  metafields jsonb,
  product_type text,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ADD CONSTRAINT IF NOT EXISTS unique_store_shopify_id UNIQUE (store_id, shopify_id);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(store_id, handle);
CREATE INDEX IF NOT EXISTS idx_products_title ON products USING gin (to_tsvector('english', title));
