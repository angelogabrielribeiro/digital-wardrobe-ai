
-- Funções internas: não devem ser chamáveis por anon/authenticated diretamente.
REVOKE ALL ON FUNCTION public.current_store_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.owns_product(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
