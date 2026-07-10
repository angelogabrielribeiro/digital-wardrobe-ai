
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- STORES
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Minha Loja',
  whatsapp TEXT,
  instagram TEXT,
  website TEXT,
  endereco TEXT,
  cor TEXT NOT NULL DEFAULT '#6C63FF',
  logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);
CREATE INDEX stores_owner_idx ON public.stores(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores_owner_all" ON public.stores FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'superior',
  preco NUMERIC(12,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  imagem TEXT,
  sku TEXT,
  buy_url TEXT,
  status TEXT NOT NULL DEFAULT 'pronto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_store_idx ON public.products(store_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.current_store_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.stores WHERE owner_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.owns_product(_product_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = _product_id AND s.owner_id = auth.uid()
  );
$$;

CREATE POLICY "products_owner_all" ON public.products FOR ALL TO authenticated
  USING (store_id = public.current_store_id())
  WITH CHECK (store_id = public.current_store_id());
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon
  USING (status = 'pronto');

-- QRCODES
CREATE TABLE public.qrcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX qrcodes_product_idx ON public.qrcodes(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qrcodes TO authenticated;
GRANT SELECT ON public.qrcodes TO anon;
GRANT ALL ON public.qrcodes TO service_role;
ALTER TABLE public.qrcodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qrcodes_owner_all" ON public.qrcodes FOR ALL TO authenticated
  USING (public.owns_product(product_id))
  WITH CHECK (public.owns_product(product_id));
CREATE POLICY "qrcodes_public_read" ON public.qrcodes FOR SELECT TO anon USING (true);

-- EXPERIMENTS
CREATE TABLE public.experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX experiments_product_idx ON public.experiments(product_id);
GRANT SELECT, INSERT ON public.experiments TO authenticated;
GRANT INSERT ON public.experiments TO anon;
GRANT ALL ON public.experiments TO service_role;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experiments_owner_select" ON public.experiments FOR SELECT TO authenticated
  USING (public.owns_product(product_id));
CREATE POLICY "experiments_public_insert" ON public.experiments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "experiments_auth_insert" ON public.experiments FOR INSERT TO authenticated WITH CHECK (true);

-- updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER stores_updated BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + store on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.stores (owner_id, nome)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'store_name', 'Minha Loja'))
    ON CONFLICT (owner_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage policies for product-images bucket
CREATE POLICY "product_images_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
CREATE POLICY "product_images_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "product_images_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "product_images_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
