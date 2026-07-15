import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ParsedProduct, ParsedVariant, VariantKind } from "./csv";

export type StudioCategory = "superior" | "inferior" | "peca-unica" | "calcados" | "acessorios";
export type ProductStatus = "pronto" | "revisar" | "sem-imagem";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type StoreRow = Database["public"]["Tables"]["stores"]["Row"];
export type QrcodeRow = Database["public"]["Tables"]["qrcodes"]["Row"];
export type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];

export type ProductVariant = {
  id: string;
  product_id: string;
  display_name: string;
  option_kind: VariantKind;
  image: string | null;
  price: number | null;
  sku: string | null;
  buyUrl: string | null;
  sizes: string[];
  sort_order: number;
};

export type Product = {
  id: string;
  store_id: string;
  name: string;
  category: StudioCategory;
  price: number;
  description: string | null;
  image: string;
  sku: string | null;
  buyUrl: string | null;
  status: ProductStatus;
  created_at: string;
  qrToken?: string;
  variants: ProductVariant[];
};

export type StoreProfile = {
  id: string;
  owner_id: string;
  nome: string;
  whatsapp: string | null;
  instagram: string | null;
  website: string | null;
  endereco: string | null;
  cor: string;
  logo: string | null;
  physical_enabled: boolean;
  ecommerce_enabled: boolean;
};

function normalizeCategory(v: string | null | undefined): StudioCategory {
  const allowed: StudioCategory[] = ["superior", "inferior", "peca-unica", "calcados", "acessorios"];
  return allowed.includes(v as StudioCategory) ? (v as StudioCategory) : "superior";
}
function normalizeStatus(v: string | null | undefined): ProductStatus {
  return v === "revisar" || v === "sem-imagem" ? v : "pronto";
}
function normalizeKind(v: string | null | undefined): VariantKind {
  const allowed: VariantKind[] = ["color", "pattern", "style", "visual", "other"];
  return allowed.includes(v as VariantKind) ? (v as VariantKind) : "visual";
}

function mapVariant(r: VariantRow): ProductVariant {
  const sizes = Array.isArray(r.sizes) ? (r.sizes as unknown[]).map(String) : [];
  return {
    id: r.id,
    product_id: r.product_id,
    display_name: r.display_name,
    option_kind: normalizeKind(r.option_kind),
    image: r.image_url,
    price: r.price !== null ? Number(r.price) : null,
    sku: r.sku,
    buyUrl: r.buy_url,
    sizes,
    sort_order: r.sort_order ?? 0,
  };
}

function mapProduct(r: ProductRow, token?: string, variants: ProductVariant[] = []): Product {
  return {
    id: r.id,
    store_id: r.store_id,
    name: r.nome,
    category: normalizeCategory(r.categoria),
    price: Number(r.preco ?? 0),
    description: r.descricao,
    image: r.imagem ?? "",
    sku: r.sku,
    buyUrl: r.buy_url,
    status: normalizeStatus(r.status),
    created_at: r.created_at,
    qrToken: token,
    variants,
  };
}

/* ---------- Store ---------- */
export async function fetchMyStore(): Promise<StoreProfile | null> {
  const { data, error } = await supabase.from("stores").select("*").maybeSingle();
  if (error) throw error;
  return data as StoreProfile | null;
}

export async function updateMyStore(patch: Partial<StoreProfile>): Promise<StoreProfile> {
  const { data: existing, error: e1 } = await supabase.from("stores").select("id").maybeSingle();
  if (e1) throw e1;
  if (!existing) throw new Error("Loja não encontrada.");
  const { data, error } = await supabase
    .from("stores")
    .update({
      nome: patch.nome,
      whatsapp: patch.whatsapp,
      instagram: patch.instagram,
      website: patch.website,
      endereco: patch.endereco,
      cor: patch.cor,
      logo: patch.logo,
      physical_enabled: patch.physical_enabled,
      ecommerce_enabled: patch.ecommerce_enabled,
    })
    .eq("id", existing.id)
    .select()
    .single();
  if (error) throw error;
  return data as StoreProfile;
}

/* ---------- Products ---------- */
export async function fetchMyProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, qrcodes(token), product_variants(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const token = (r as any).qrcodes?.[0]?.token as string | undefined;
    const rawVars = ((r as any).product_variants ?? []) as VariantRow[];
    const variants = rawVars
      .map(mapVariant)
      .sort((a, b) => a.sort_order - b.sort_order);
    return mapProduct(r as ProductRow, token, variants);
  });
}

export type ProductInput = {
  name: string;
  category: StudioCategory;
  price: number;
  description?: string;
  image?: string;
  sku?: string;
  buyUrl?: string;
};

function statusFor(image?: string): ProductStatus {
  return image && image.trim().length > 0 ? "pronto" : "sem-imagem";
}

function makeToken(): string {
  return (
    Math.random().toString(36).slice(2, 12) +
    Math.random().toString(36).slice(2, 14)
  );
}

async function ensureStoreId(): Promise<string> {
  const { data, error } = await supabase.from("stores").select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Loja não encontrada.");
  return data.id;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const store_id = await ensureStoreId();
  const status = statusFor(input.image);
  const { data, error } = await supabase
    .from("products")
    .insert({
      store_id,
      nome: input.name,
      categoria: input.category,
      preco: input.price,
      descricao: input.description ?? null,
      imagem: input.image ?? null,
      sku: input.sku ?? null,
      buy_url: input.buyUrl ?? null,
      status,
    })
    .select()
    .single();
  if (error) throw error;
  const token = makeToken();
  const { error: qErr } = await supabase.from("qrcodes").insert({ product_id: data.id, token });
  if (qErr) throw qErr;
  return mapProduct(data as ProductRow, token, []);
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<void> {
  const patch: Database["public"]["Tables"]["products"]["Update"] = {};
  if (input.name !== undefined) patch.nome = input.name;
  if (input.category !== undefined) patch.categoria = input.category;
  if (input.price !== undefined) patch.preco = input.price;
  if (input.description !== undefined) patch.descricao = input.description;
  if (input.image !== undefined) {
    patch.imagem = input.image;
    patch.status = statusFor(input.image);
  }
  if (input.sku !== undefined) patch.sku = input.sku;
  if (input.buyUrl !== undefined) patch.buy_url = input.buyUrl;
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Variants ---------- */
export async function updateVariant(id: string, patch: Partial<ProductVariant>): Promise<void> {
  const upd: Database["public"]["Tables"]["product_variants"]["Update"] = {};
  if (patch.display_name !== undefined) upd.display_name = patch.display_name;
  if (patch.option_kind !== undefined) upd.option_kind = patch.option_kind;
  if (patch.image !== undefined) upd.image_url = patch.image;
  if (patch.price !== undefined) upd.price = patch.price;
  if (patch.buyUrl !== undefined) upd.buy_url = patch.buyUrl;
  if (patch.sku !== undefined) upd.sku = patch.sku;
  if (patch.sizes !== undefined) upd.sizes = patch.sizes as any;
  const { error } = await supabase.from("product_variants").update(upd).eq("id", id);
  if (error) throw error;
}

/* ---------- Bulk import with variants ---------- */
export async function bulkCreateParsedProducts(products: ParsedProduct[]): Promise<void> {
  if (products.length === 0) return;
  const store_id = await ensureStoreId();

  // Insert products first.
  const payload = products.map((p) => ({
    store_id,
    nome: p.name,
    categoria: p.category,
    preco: p.price,
    descricao: p.description ?? null,
    imagem: p.image ?? null,
    sku: p.sku ?? null,
    buy_url: p.buyUrl ?? null,
    status: statusFor(p.image),
  }));
  const { data: inserted, error } = await supabase.from("products").insert(payload).select("id");
  if (error) throw error;
  const ids = (inserted ?? []).map((r) => r.id);

  // QR codes.
  const qrs = ids.map((id) => ({ product_id: id, token: makeToken() }));
  if (qrs.length > 0) {
    const { error: qErr } = await supabase.from("qrcodes").insert(qrs);
    if (qErr) throw qErr;
  }

  // Variants (skip products without variants — they use the product's default image).
  const variantPayload: Database["public"]["Tables"]["product_variants"]["Insert"][] = [];
  products.forEach((p, i) => {
    const productId = ids[i];
    if (!productId) return;
    p.variants.forEach((v: ParsedVariant, order: number) => {
      variantPayload.push({
        product_id: productId,
        source_option_name: v.source_option_name ?? null,
        source_option_value: v.source_option_value ?? null,
        display_name: v.display_name,
        option_kind: v.option_kind,
        image_url: v.image ?? p.image ?? null,
        price: v.price ?? null,
        sku: v.sku ?? null,
        buy_url: v.buyUrl ?? null,
        sizes: (v.sizes ?? []) as any,
        sort_order: order,
      });
    });
  });
  if (variantPayload.length > 0) {
    const { error: vErr } = await supabase.from("product_variants").insert(variantPayload);
    if (vErr) throw vErr;
  }
}

// Backwards-compat: legacy import path with just ProductInput[].
export async function bulkCreateProducts(rows: ProductInput[]): Promise<void> {
  const asParsed: ParsedProduct[] = rows.map((r) => ({
    name: r.name,
    category: r.category,
    price: r.price,
    description: r.description,
    image: r.image,
    sku: r.sku,
    buyUrl: r.buyUrl,
    sizes: [],
    variants: [],
  }));
  await bulkCreateParsedProducts(asParsed);
}

/* ---------- Insights ---------- */
export type Insights = {
  totalProducts: number;
  totalQr: number;
  totalExperiments: number;
  perProduct: Array<{ product_id: string; count: number }>;
};

export async function fetchInsights(): Promise<Insights> {
  const [products, qrs, exps] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("qrcodes").select("id", { count: "exact", head: true }),
    supabase.from("experiments").select("product_id"),
  ]);
  if (products.error) throw products.error;
  if (qrs.error) throw qrs.error;
  if (exps.error) throw exps.error;
  const counts = new Map<string, number>();
  for (const e of exps.data ?? []) {
    counts.set(e.product_id, (counts.get(e.product_id) ?? 0) + 1);
  }
  return {
    totalProducts: products.count ?? 0,
    totalQr: qrs.count ?? 0,
    totalExperiments: exps.data?.length ?? 0,
    perProduct: Array.from(counts, ([product_id, count]) => ({ product_id, count })),
  };
}

/* ---------- Public try-on (via RPC — não expõe qrcodes) ---------- */
export async function fetchProductByToken(token: string): Promise<Product | null> {
  const [{ data: prow, error: pErr }, { data: vrows, error: vErr }] = await Promise.all([
    supabase.rpc("get_product_by_token", { _token: token }),
    supabase.rpc("get_variants_by_token", { _token: token }),
  ]);
  if (pErr) throw pErr;
  if (vErr) throw vErr;
  const row = Array.isArray(prow) ? prow[0] : prow;
  if (!row) return null;

  const variants: ProductVariant[] = (vrows ?? []).map((v: any) => ({
    id: v.id,
    product_id: v.product_id,
    display_name: v.display_name,
    option_kind: normalizeKind(v.option_kind),
    image: v.image_url,
    price: v.price !== null ? Number(v.price) : null,
    sku: v.sku,
    buyUrl: v.buy_url,
    sizes: Array.isArray(v.sizes) ? (v.sizes as unknown[]).map(String) : [],
    sort_order: v.sort_order ?? 0,
  }));

  return mapProduct(row as ProductRow, token, variants);
}
