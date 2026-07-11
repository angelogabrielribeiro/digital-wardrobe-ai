
-- 1) Fecha exposição pública da tabela qrcodes (não deve ser listável).
DROP POLICY IF EXISTS qrcodes_public_read ON public.qrcodes;

-- 2) Fecha listagem pública direta de products; acesso público passa pelo token.
DROP POLICY IF EXISTS products_public_read ON public.products;

-- 3) Adiciona canais persistidos na loja.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS physical_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ecommerce_enabled boolean NOT NULL DEFAULT true;

-- 4) Restringe experimentações anônimas a produtos publicados ("pronto").
DROP POLICY IF EXISTS experiments_public_insert ON public.experiments;
CREATE POLICY experiments_public_insert
  ON public.experiments
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = experiments.product_id AND p.status = 'pronto'
    )
  );

DROP POLICY IF EXISTS experiments_auth_insert ON public.experiments;
CREATE POLICY experiments_auth_insert
  ON public.experiments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = experiments.product_id AND p.status = 'pronto'
    )
  );

-- 5) RPC pública: busca produto por token sem expor a tabela qrcodes.
CREATE OR REPLACE FUNCTION public.get_product_by_token(_token text)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  nome text,
  categoria text,
  preco numeric,
  descricao text,
  imagem text,
  sku text,
  buy_url text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.store_id, p.nome, p.categoria, p.preco, p.descricao,
         p.imagem, p.sku, p.buy_url, p.status, p.created_at, p.updated_at
  FROM public.qrcodes q
  JOIN public.products p ON p.id = q.product_id
  WHERE q.token = _token
    AND p.status = 'pronto'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_product_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_by_token(text) TO anon, authenticated;

-- 6) RPC pública: registra experimentação por token (sem expor product_id ao anon).
CREATE OR REPLACE FUNCTION public.log_experiment_by_token(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pid uuid;
BEGIN
  SELECT p.id INTO _pid
  FROM public.qrcodes q
  JOIN public.products p ON p.id = q.product_id
  WHERE q.token = _token AND p.status = 'pronto'
  LIMIT 1;

  IF _pid IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

  INSERT INTO public.experiments (product_id) VALUES (_pid);
END;
$$;

REVOKE ALL ON FUNCTION public.log_experiment_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_experiment_by_token(text) TO anon, authenticated;
