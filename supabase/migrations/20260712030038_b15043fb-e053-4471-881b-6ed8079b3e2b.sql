
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS input_url text,
  ADD COLUMN IF NOT EXISTS result_url text,
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS experiments_store_id_idx ON public.experiments(store_id);
CREATE INDEX IF NOT EXISTS experiments_product_id_idx ON public.experiments(product_id);

-- Owners can read experiments of their own store (denormalized index for insights)
DROP POLICY IF EXISTS experiments_owner_select_by_store ON public.experiments;
CREATE POLICY experiments_owner_select_by_store ON public.experiments
  FOR SELECT TO authenticated
  USING (store_id IS NOT NULL AND store_id = public.current_store_id());
