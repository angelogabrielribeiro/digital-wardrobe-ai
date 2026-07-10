
REVOKE EXECUTE ON FUNCTION public.current_store_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_product(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "experiments_public_insert" ON public.experiments;
DROP POLICY IF EXISTS "experiments_auth_insert" ON public.experiments;
CREATE POLICY "experiments_public_insert" ON public.experiments FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id));
CREATE POLICY "experiments_auth_insert" ON public.experiments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id));
