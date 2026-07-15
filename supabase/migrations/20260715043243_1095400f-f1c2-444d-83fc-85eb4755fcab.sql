
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source_option_name text,
  source_option_value text,
  display_name text NOT NULL,
  option_kind text NOT NULL DEFAULT 'visual',
  image_url text,
  price numeric,
  sku text,
  buy_url text,
  sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_kind_chk
    CHECK (option_kind IN ('color','pattern','style','visual','other'))
);

CREATE INDEX product_variants_product_id_idx ON public.product_variants (product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_variants_owner_all
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING (public.owns_product(product_id))
  WITH CHECK (public.owns_product(product_id));

CREATE TRIGGER trg_product_variants_updated
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_variants_by_token(_token text)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  display_name text,
  option_kind text,
  image_url text,
  price numeric,
  sku text,
  buy_url text,
  sizes jsonb,
  sort_order int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.product_id, v.display_name, v.option_kind, v.image_url,
         v.price, v.sku, v.buy_url, v.sizes, v.sort_order
  FROM public.qrcodes q
  JOIN public.products p ON p.id = q.product_id
  JOIN public.product_variants v ON v.product_id = p.id
  WHERE q.token = _token
    AND p.status = 'pronto'
  ORDER BY v.sort_order, v.created_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_variants_by_token(text) TO anon, authenticated;

DROP POLICY IF EXISTS experiments_public_insert ON public.experiments;
DROP POLICY IF EXISTS experiments_auth_insert ON public.experiments;
DROP FUNCTION IF EXISTS public.log_experiment_by_token(text);
