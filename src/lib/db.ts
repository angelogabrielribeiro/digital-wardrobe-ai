import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type StudioCategory = "superior" | "inferior" | "peca-unica" | "calcados" | "acessorios";
export type ProductStatus = "pronto" | "revisar" | "sem-imagem";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type StoreRow = Database["public"]["Tables"]["stores"]["Row"];
export type QrcodeRow = Database["public"]["Tables"]["qrcodes"]["Row"];

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

function mapProduct(r: ProductRow, token?: string): Product {
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
    .select("*, qrcodes(token)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const token = (r as any).qrcodes?.[0]?.token as string | undefined;
    return mapProduct(r as ProductRow, token);
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
  // 22-char base36 token
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
  return mapProduct(data as ProductRow, token);
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

export async function bulkCreateProducts(rows: ProductInput[]): Promise<void> {
  if (rows.length === 0) return;
  const store_id = await ensureStoreId();
  const payload = rows.map((r) => ({
    store_id,
    nome: r.name,
    categoria: r.category,
    preco: r.price,
    descricao: r.description ?? null,
    imagem: r.image ?? null,
    sku: r.sku ?? null,
    buy_url: r.buyUrl ?? null,
    status: statusFor(r.image),
  }));
  const { data, error } = await supabase.from("products").insert(payload).select("id");
  if (error) throw error;
  const qrs = (data ?? []).map((p) => ({ product_id: p.id, token: makeToken() }));
  if (qrs.length > 0) {
    const { error: qErr } = await supabase.from("qrcodes").insert(qrs);
    if (qErr) throw qErr;
  }
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

/* ---------- Public try-on ---------- */
export async function fetchProductByToken(token: string): Promise<Product | null> {
  const { data: qr, error: qErr } = await supabase
    .from("qrcodes")
    .select("product_id")
    .eq("token", token)
    .maybeSingle();
  if (qErr) throw qErr;
  if (!qr) return null;
  const { data: p, error: pErr } = await supabase
    .from("products")
    .select("*")
    .eq("id", qr.product_id)
    .maybeSingle();
  if (pErr) throw pErr;
  return p ? mapProduct(p as ProductRow, token) : null;
}

export async function logExperiment(product_id: string): Promise<void> {
  const { error } = await supabase.from("experiments").insert({ product_id });
  if (error) throw error;
}
