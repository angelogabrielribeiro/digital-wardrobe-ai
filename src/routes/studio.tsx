import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Package, QrCode, BarChart3, Store as StoreIcon,
  ArrowLeft, Upload, FileSpreadsheet, Sparkles, ArrowRight, Plus, Search,
  Download, Copy, Printer, MessageCircle, X, TrendingUp, Eye, Bookmark,
  ShoppingBag, Instagram, Globe, MapPin, Phone, Check, AlertTriangle,
  ImageOff, Lock, Pencil, Info, LogOut,
} from "lucide-react";
import {
  bulkCreateParsedProducts, createProduct, deleteProduct, fetchInsights,
  fetchMyProducts, fetchMyStore, updateMyStore, updateProduct,
  type Product, type ProductInput, type StoreProfile, type StudioCategory,
} from "@/lib/db";
import { downloadQr, generateQrDataUrl, tryOnUrl } from "@/lib/qr";
import { uploadProductImage } from "@/lib/upload";
import { parseSpreadsheetFile, isSupportedSpreadsheet } from "@/lib/spreadsheet";
import type { ParsedProduct, VariantKind } from "@/lib/csv";
import { signOut, useAuth } from "@/hooks/use-auth";

const CATEGORY_LABEL: Record<StudioCategory, string> = {
  superior: "Superior",
  inferior: "Inferior",
  "peca-unica": "Peça única",
  calcados: "Calçados",
  acessorios: "Acessórios",
};
const PRO_CATEGORIES: StudioCategory[] = ["calcados", "acessorios"];

// Visual-layer product shape kept for compatibility with existing components.
export type StudioProduct = {
  id: string;
  name: string;
  category: StudioCategory;
  price: number;
  sku?: string;
  image: string;
  buyUrl?: string;
  status: "pronto" | "revisar" | "sem-imagem";
  stats: { views: number; tryons: number; saves: number; buyClicks: number };
  qrToken?: string;
  variantCount: number;
  sizeCount: number;
  dominantKind: VariantKind | null;
};

type CatalogRow = {
  id: string;
  name: string;
  category: StudioCategory;
  price: number;
  sku?: string;
  image?: string;
  buyUrl?: string;
  status: "pronto" | "revisar" | "sem-imagem";
  variantCount: number;
  sizeCount: number;
  source: ParsedProduct;
};

function toStudioProduct(p: Product, tryons: number): StudioProduct {
  const sizes = new Set<string>();
  for (const v of p.variants) for (const s of v.sizes) sizes.add(s);
  const dominantKind = p.variants[0]?.option_kind ?? null;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    sku: p.sku ?? undefined,
    image: p.image,
    buyUrl: p.buyUrl ?? undefined,
    status: p.status,
    stats: { views: tryons, tryons, saves: 0, buyClicks: 0 },
    qrToken: p.qrToken,
    variantCount: p.variants.length,
    sizeCount: sizes.size,
    dominantKind,
  };
}

// Sem dados mockados — estados vazios até existirem dados reais.



export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "AuraFit Studio — Painel do lojista" },
      {
        name: "description",
        content:
          "AuraFit Studio ajuda sua loja a vender mais roupas com provador visual, QR Codes e insights de interesse.",
      },
      { property: "og:title", content: "AuraFit Studio — Painel do lojista" },
      {
        property: "og:description",
        content: "ERP controla estoque. AuraFit faz vender o estoque.",
      },
    ],
  }),
  component: StudioApp,
});

type Tab = "dashboard" | "produtos" | "publicacao" | "insights" | "loja";

export type StoreChannels = { fisica: boolean; ecommerce: boolean };

/* ─────────────────────────── Root ─────────────────────────── */
function StudioApp() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/auth", replace: true });
  }, [session, authLoading, navigate]);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: fetchMyProducts,
    enabled: !!session,
  });
  const insightsQuery = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    enabled: !!session,
  });
  const storeQuery = useQuery({
    queryKey: ["store"],
    queryFn: fetchMyStore,
    enabled: !!session,
  });

  const tryonsByProduct = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of insightsQuery.data?.perProduct ?? []) m.set(row.product_id, row.count);
    return m;
  }, [insightsQuery.data]);

  const products: StudioProduct[] = useMemo(
    () => (productsQuery.data ?? []).map((p) => toStudioProduct(p, tryonsByProduct.get(p.id) ?? 0)),
    [productsQuery.data, tryonsByProduct],
  );

  const [tab, setTab] = useState<Tab>("dashboard");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [qrProduct, setQrProduct] = useState<StudioProduct | null>(null);
  const [linkProduct, setLinkProduct] = useState<StudioProduct | null>(null);
  const [detailProduct, setDetailProduct] = useState<StudioProduct | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [promoteName, setPromoteName] = useState<string | null>(null);
  const [interestedOpen, setInterestedOpen] = useState(false);

  const store = storeQuery.data ?? null;
  const channels: StoreChannels = {
    fisica: store?.physical_enabled ?? true,
    ecommerce: store?.ecommerce_enabled ?? true,
  };

  // Aguarda o carregamento das consultas antes de decidir entre onboarding e Painel,
  // para não “piscar” o Painel vazio antes do onboarding.
  const storeReady = !productsQuery.isLoading && !storeQuery.isLoading;
  const showOnboarding =
    storeReady && !onboardingDismissed && products.length === 0;

  async function handleAddProduct(input: ProductInput) {
    await createProduct(input);
    await Promise.all([qc.invalidateQueries({ queryKey: ["products"] }), qc.invalidateQueries({ queryKey: ["insights"] })]);
    setAddOpen(false);
  }
  async function handlePublishImport(rows: CatalogRow[]) {
    await bulkCreateParsedProducts(rows.map((r) => r.source));
    await qc.invalidateQueries({ queryKey: ["products"] });
    setImportOpen(false);
    setTab("produtos");
  }

  if (authLoading || !session) {
    return <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Carregando…</div>;
  }


  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background pb-28">
      <StudioHeader onLogout={async () => { await signOut(); qc.clear(); navigate({ to: "/auth", replace: true }); }} />

      <main className="flex-1">
        {!storeReady ? (
          <div className="flex min-h-[60vh] items-center justify-center px-5 text-center">
            <p className="text-[12.5px] text-muted-foreground">Carregando sua loja…</p>
          </div>
        ) : showOnboarding ? (
          <Onboarding
            onImport={() => setImportOpen(true)}
            onFinish={() => setOnboardingDismissed(true)}
            hasProducts={products.length > 0}
          />
        ) : (
          <>
            {tab === "dashboard" && (
              <Dashboard products={products} onImport={() => setImportOpen(true)} onOpenInterested={() => setInterestedOpen(true)} />
            )}
            {tab === "produtos" && (
              <Products products={products} onImport={() => setImportOpen(true)} onAdd={() => setAddOpen(true)}
                onOpen={(p) => setDetailProduct(p)} onQr={(p) => setQrProduct(p)} />
            )}
            {tab === "publicacao" && (
              <PublishPage products={products} channels={channels} onQr={(p) => setQrProduct(p)} onLink={(p) => setLinkProduct(p)} />
            )}
            {tab === "insights" && (
              <Insights products={products} onPromote={(n) => setPromoteName(n)} onOpenInterested={() => setInterestedOpen(true)} />
            )}
            {tab === "loja" && <StorePage store={store} loading={storeQuery.isLoading} />}
          </>
        )}
      </main>

      {storeReady && !showOnboarding && <StudioBottomNav current={tab} onGo={setTab} />}

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onPublish={handlePublishImport} />}
      {qrProduct && <QrModal product={qrProduct} storeName={store?.nome ?? null} onClose={() => setQrProduct(null)} />}
      {linkProduct && <LinkModal product={linkProduct} onClose={() => setLinkProduct(null)} />}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onQr={() => { setQrProduct(detailProduct); setDetailProduct(null); }}
        />
      )}
      {addOpen && <AddProductModal onClose={() => setAddOpen(false)} onSave={handleAddProduct} />}
      {promoteName && <PromoteModal name={promoteName} onClose={() => setPromoteName(null)} />}
      {interestedOpen && <InterestedModal onClose={() => setInterestedOpen(false)} />}
    </div>
  );
}

/* ─────────────────────────── Header ─────────────────────────── */
function StudioHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[color:var(--border)] bg-background/80 px-5 py-3.5 backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} />
        Modo Cliente
      </Link>
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-brand" strokeWidth={1.7} />
        <span className="text-[13px] font-medium tracking-tight">AuraFit Studio</span>
      </div>
      <button onClick={onLogout} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground" aria-label="Sair">
        <LogOut className="h-3.5 w-3.5" strokeWidth={1.7} /> Sair
      </button>
    </header>
  );
}

/* ─────────────────────────── Onboarding ─────────────────────────── */
function Onboarding({
  onImport,
  onFinish,
  hasProducts,
}: {
  onImport: () => void;
  onFinish: () => void;
  hasProducts: boolean;
}) {
  const steps = [
    {
      key: "import",
      title: "Importar produtos",
      desc: "Envie sua planilha e o AuraFit organiza tudo.",
      icon: Upload,
      cta: "Importar",
      done: hasProducts,
      action: onImport,
    },
    {
      key: "review",
      title: "Revisar produtos",
      desc: "Confira nomes, imagens e categorias antes de publicar.",
      icon: Check,
      cta: "Revisar",
      done: false,
      action: onFinish,
    },
    {
      key: "publish",
      title: "Publicar",
      desc: "Gere links para ecommerce e QR Codes para a loja física.",
      icon: QrCode,
      cta: "Publicar",
      done: false,
      action: onFinish,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-8 px-5 pt-10 fade-in">
      <section>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Bem-vindo
        </p>
        <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">
          Vamos preparar<br />sua loja.
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Três passos simples para começar a vender com o provador virtual.
        </p>
      </section>

      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isCurrent =
            (i === 0 && !hasProducts) || (i === 1 && hasProducts) || (i === 2 && hasProducts);
          return (
            <li
              key={s.key}
              className={`glass flex items-start gap-3 rounded-3xl p-5 transition-all ${
                isCurrent ? "border-brand/40 shadow-[0_0_0_1px_rgba(109,94,248,0.25)]" : ""
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                  s.done
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                    : isCurrent
                      ? "bg-brand/15 text-brand ring-brand/30"
                      : "bg-white/[0.04] text-white/50 ring-white/10"
                }`}
              >
                {s.done ? (
                  <Check className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Passo {i + 1}
                  </span>
                </div>
                <p className="mt-1 text-[14px] font-medium">{s.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
                {isCurrent && (
                  <button
                    onClick={s.action}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[12px] font-medium text-white transition-transform active:scale-[0.98]"
                  >
                    {s.cta}
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <button
        onClick={onFinish}
        className="mx-auto text-[11.5px] text-muted-foreground hover:text-foreground"
      >
        Pular por enquanto
      </button>
    </div>
  );
}

/* ─────────────────────────── Dashboard ─────────────────────────── */
function Dashboard({
  products,
  onImport,
  onOpenInterested,
}: {
  products: StudioProduct[];
  onImport: () => void;
  onOpenInterested: () => void;
}) {
  const tried = products.reduce((n, p) => n + p.stats.tryons, 0);
  const buys = products.reduce((n, p) => n + p.stats.buyClicks, 0);
  const est = buys > 0 ? products.reduce((n, p) => n + p.stats.buyClicks * p.price, 0) : 0;
  const hasData = tried > 0 || buys > 0;

  return (
    <div className="flex flex-col gap-8 px-5 pt-8 fade-in">
      <section>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Sua loja hoje
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-[-0.03em]">
          Painel
        </h1>
      </section>

      {products.length > 0 && (
        <div className="glass flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
            <Check className="h-4 w-4" strokeWidth={2} />
          </div>
          <p className="text-[12.5px] leading-snug">
            Sua loja já pode oferecer o provador virtual.
          </p>
        </div>
      )}

      <section className="flex flex-col gap-2.5">
        <BigKpi
          label="Produtos experimentados"
          value={tried.toLocaleString("pt-BR")}
          icon={Sparkles}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <SmallKpi
            label="Cliques em comprar"
            value={buys.toLocaleString("pt-BR")}
            icon={ShoppingBag}
          />
          <SmallKpi
            label="Vendas estimadas"
            value={`R$ ${Math.round(est).toLocaleString("pt-BR")}`}
            icon={TrendingUp}
            highlight
          />
        </div>
      </section>

      <button
        onClick={onImport}
        className="glass flex items-center justify-between rounded-3xl p-4 text-left transition-all active:scale-[0.99] hover:border-white/[0.10]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 ring-1 ring-brand/20">
            <Upload className="h-4 w-4 text-brand" strokeWidth={1.7} />
          </div>
          <div>
            <p className="text-[13.5px] font-medium">Importar mais produtos</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">Planilha Excel ou CSV</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.6} />
      </button>

      <section className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Clientes interessados
          </p>
          <span className="text-[10px] text-brand">Hoje</span>
        </div>
        {hasData ? (
          <>
            <p className="mt-3 text-[15px] leading-snug">
              <span className="font-semibold">{tried.toLocaleString("pt-BR")}</span>{" "}
              {tried === 1 ? "pessoa experimentou" : "pessoas experimentaram"} uma peça.<br />
              <span className="text-muted-foreground">
                {Math.max(0, tried - buys).toLocaleString("pt-BR")} saíram sem clicar em comprar.
              </span>
            </p>
            <button
              onClick={onOpenInterested}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[12.5px] font-medium text-white transition-transform active:scale-[0.98]"
            >
              Criar mensagem de retorno
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </>
        ) : (
          <p className="mt-3 text-[12.5px] leading-snug text-muted-foreground">
            Ainda não há dados suficientes. Publique seus primeiros produtos e compartilhe seus QR Codes ou links para começar a acompanhar as experimentações.
          </p>
        )}
      </section>

      <p className="pb-4 text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Powered by AuraFit
      </p>
    </div>
  );
}

function BigKpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="glass rounded-3xl bg-gradient-to-br from-[#1a1436] to-[#111217] p-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-brand" strokeWidth={1.7} />
      </div>
      <p className="mt-3 font-display text-[34px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function SmallKpi({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <Icon
          className={`h-3.5 w-3.5 ${highlight ? "text-brand" : "text-white/50"}`}
          strokeWidth={1.7}
        />
      </div>
      <p className="mt-2 font-display text-[20px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}

/* ─────────────────────────── Products ─────────────────────────── */
function Products({
  products,
  onImport,
  onAdd,
  onOpen,
  onQr,
}: {
  products: StudioProduct[];
  onImport: () => void;
  onAdd: () => void;
  onOpen: (p: StudioProduct) => void;
  onQr: (p: StudioProduct) => void;
}) {
  const [cat, setCat] = useState<StudioCategory | "todos">("todos");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return products.filter(
      (p) =>
        (cat === "todos" || p.category === cat) &&
        (q.trim() === "" || p.name.toLowerCase().includes(q.trim().toLowerCase())),
    );
  }, [products, cat, q]);

  const cats: Array<{ key: StudioCategory | "todos"; label: string; pro?: boolean }> = [
    { key: "todos", label: "Todos" },
    { key: "superior", label: "Superior" },
    { key: "inferior", label: "Inferior" },
    { key: "peca-unica", label: "Peça única" },
    { key: "calcados", label: "Calçados", pro: true },
    { key: "acessorios", label: "Acessórios", pro: true },
  ];

  return (
    <div className="flex flex-col gap-5 px-5 pt-7 fade-in">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Catálogo</p>
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.03em]">
            Produtos
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onImport}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11.5px] font-medium transition-colors hover:bg-white/[0.06]"
          >
            Importar
          </button>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-2 text-[11.5px] font-medium text-white transition-transform active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Adicionar
          </button>
        </div>
      </header>

      <div className="glass flex items-center gap-2 rounded-2xl px-3.5 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.6} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar produto"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="scrollbar-hide -mx-5 flex gap-1.5 overflow-x-auto px-5">
        {cats.map((c) => {
          const active = cat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-all ${
                active
                  ? "border-brand bg-brand/15 text-brand"
                  : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
              {c.pro && <span className="ml-1 text-[9px] uppercase text-brand/80">Pro</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} onOpen={() => onOpen(p)} onQr={() => onQr(p)} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-xs text-muted-foreground">
            Nenhum produto encontrado.
          </p>
        )}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onOpen,
  onQr,
}: {
  product: StudioProduct;
  onOpen: () => void;
  onQr: () => void;
}) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <button onClick={onOpen} className="relative block aspect-[4/5] w-full bg-white/[0.03]">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-6 w-6 text-white/30" strokeWidth={1.5} />
          </div>
        )}
        <StatusPill status={product.status} />
      </button>
      <div className="flex items-center justify-between gap-2 p-3">
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[12.5px] font-medium">{product.name}</p>
        </button>
        <button
          onClick={onQr}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] text-foreground/80 hover:bg-white/[0.06]"
          aria-label="Baixar QR Code"
        >
          <QrCode className="h-3 w-3" strokeWidth={1.7} /> QR
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: StudioProduct["status"] }) {
  const map = {
    pronto: {
      label: "Pronto",
      cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
      Icon: Check,
    },
    revisar: {
      label: "Revisar",
      cls: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
      Icon: AlertTriangle,
    },
    "sem-imagem": {
      label: "Sem imagem",
      cls: "bg-red-500/15 text-red-300 ring-red-400/30",
      Icon: ImageOff,
    },
  } as const;
  const { label, cls, Icon } = map[status];
  return (
    <span
      className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-medium ring-1 ${cls}`}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2} />
      {label}
    </span>
  );
}

/* ─────────────────────────── Product detail modal ─────────────────────────── */
function ProductDetailModal({
  product,
  onClose,
  onQr,
}: {
  product: StudioProduct;
  onClose: () => void;
  onQr: () => void;
}) {
  return (
    <Modal onClose={onClose} title={product.name}>
      <div className="flex flex-col gap-4">
        <div className="glass overflow-hidden rounded-2xl">
          <div className="relative aspect-[4/3] bg-white/[0.03]">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-8 w-8 text-white/30" strokeWidth={1.4} />
              </div>
            )}
            <StatusPill status={product.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="glass rounded-2xl p-3.5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Preço</p>
            <p className="mt-1.5 text-[15px] font-semibold">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </p>
          </div>
          <div className="glass rounded-2xl p-3.5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Categoria
            </p>
            <p className="mt-1.5 text-[13px] font-medium">{CATEGORY_LABEL[product.category]}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onQr}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12px] font-medium text-white transition-transform active:scale-[0.98]"
          >
            <QrCode className="h-3.5 w-3.5" strokeWidth={1.8} /> QR Code
          </button>
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium hover:bg-white/[0.06]"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.7} /> Editar
          </button>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.7} />
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Informações
            </p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[12px]">
            <dt className="text-muted-foreground">SKU</dt>
            <dd className="text-right">{product.sku ?? "—"}</dd>
            <dt className="text-muted-foreground">Link de compra</dt>
            <dd className="truncate text-right">
              {product.buyUrl ? (
                <a
                  href={product.buyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand hover:underline"
                >
                  Abrir
                </a>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-muted-foreground">Experimentos</dt>
            <dd className="text-right tabular-nums">{product.stats.tryons}</dd>
            <dt className="text-muted-foreground">Cliques em comprar</dt>
            <dd className="text-right tabular-nums">{product.stats.buyClicks}</dd>
          </dl>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────── QR Codes ─────────────────────────── */
function PublishPage({
  products,
  channels,
  onQr,
  onLink,
}: {
  products: StudioProduct[];
  channels: StoreChannels;
  onQr: (p: StudioProduct) => void;
  onLink: (p: StudioProduct) => void;
}) {
  const noChannel = !channels.fisica && !channels.ecommerce;
  return (
    <div className="flex flex-col gap-5 px-5 pt-7 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Provador para o cliente
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.03em]">
          Publicação
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Disponibilize o provador para cada peça. Use um link no ecommerce ou um QR Code na loja
          física.
        </p>
      </header>

      {noChannel && (
        <div className="glass rounded-2xl p-4 text-[12.5px] text-muted-foreground">
          Ative <span className="text-foreground">Loja física</span> ou{" "}
          <span className="text-foreground">Ecommerce</span> em <em>Loja</em> para publicar o
          provador.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {products.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-xs text-muted-foreground">
            Importe seu catálogo para começar a publicar.
          </p>
        )}
        {products.map((p) => (
          <div key={p.id} className="glass flex flex-col gap-3 rounded-2xl p-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
                {p.image ? (
                  <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-4 w-4 text-white/30" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{p.name}</p>
                <p className="text-[10.5px] text-muted-foreground">{CATEGORY_LABEL[p.category]}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {channels.ecommerce && (
                <button
                  onClick={() => onLink(p)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium hover:bg-white/[0.06]"
                >
                  <Copy className="h-3 w-3" strokeWidth={1.8} /> Copiar Link
                </button>
              )}
              {channels.fisica && (
                <button
                  onClick={() => onQr(p)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium hover:bg-white/[0.06]"
                >
                  <QrCode className="h-3 w-3" strokeWidth={1.8} /> Gerar QR Code
                </button>
              )}
              <Link
                to="/"
                className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1.5 text-[11px] font-medium text-brand hover:bg-brand/25"
              >
                <Eye className="h-3 w-3" strokeWidth={1.8} /> Abrir Provador
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FakeQr({ seed, size = 160 }: { seed: string; size?: number }) {
  const cells = 21;
  const grid = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) & 0xff) / 255;
    return Array.from({ length: cells * cells }, () => rnd() > 0.5);
  }, [seed]);
  const cell = size / cells;
  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) =>
      r >= br &&
      r < br + 7 &&
      c >= bc &&
      c < bc + 7 &&
      !(
        r > br &&
        r < br + 6 &&
        c > bc &&
        c < bc + 6 &&
        (r === br + 1 || r === br + 5 || c === bc + 1 || c === bc + 5)
      );
    return inBox(0, 0) || inBox(0, cells - 7) || inBox(cells - 7, 0);
  };
  const inFinderBox = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-md"
      aria-hidden
    >
      <rect width={size} height={size} fill="#fff" />
      {Array.from({ length: cells }).map((_, r) =>
        Array.from({ length: cells }).map((_, c) => {
          if (inFinderBox(r, c)) {
            return isFinder(r, c) ? (
              <rect
                key={`${r}-${c}`}
                x={c * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill="#000"
              />
            ) : null;
          }
          return grid[r * cells + c] ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell}
              y={r * cell}
              width={cell}
              height={cell}
              fill="#000"
            />
          ) : null;
        }),
      )}
    </svg>
  );
}

/* ─────────────────────────── Insights ─────────────────────────── */
function Insights({
  products,
  onPromote,
  onOpenInterested,
}: {
  products: StudioProduct[];
  onPromote: (name: string) => void;
  onOpenInterested: () => void;
}) {
  const topThree = [...products].sort((a, b) => b.stats.tryons - a.stats.tryons).slice(0, 3);
  const totalTry = products.reduce((n, p) => n + p.stats.tryons, 0);
  const totalBuys = products.reduce((n, p) => n + p.stats.buyClicks, 0);
  const withTry = topThree.filter((p) => p.stats.tryons > 0);
  const forgotten = products.filter((p) => p.stats.tryons === 0).slice(0, 3);
  const hasData = totalTry > 0;

  return (
    <div className="flex flex-col gap-8 px-5 pt-7 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Últimos 7 dias
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.03em]">
          Insights
        </h1>
      </header>

      {!hasData ? (
        <div className="glass rounded-3xl bg-gradient-to-br from-[#1a1436] to-[#111217] p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-brand/80">Sem dados ainda</p>
          <p className="mt-2 text-[13px] leading-snug text-white/90">
            Ainda não temos dados suficientes. Publique produtos e compartilhe seus QR Codes ou links para começar.
          </p>
        </div>
      ) : (
        <>
          {/* Funil dos produtos mais experimentados */}
          <section className="flex flex-col gap-3">
            <SectionTitle overline="Desempenho" title="Mais experimentados" />
            {withTry.map((p) => (
              <ProductFunnel key={p.id} product={p} />
            ))}
          </section>

          {/* Produtos esquecidos */}
          {forgotten.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionTitle
                overline="Atenção"
                title="Produtos esquecidos"
                desc="Ainda sem experimentações."
              />
              <div className="flex flex-col gap-2">
                {forgotten.map((p) => (
                  <div key={p.id} className="glass flex items-center justify-between rounded-2xl p-4">
                    <div>
                      <p className="text-[13px] font-medium">{p.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Nenhuma experimentação até agora
                      </p>
                    </div>
                    <button
                      onClick={() => onPromote(p.name)}
                      className="rounded-full bg-brand/15 px-3 py-1.5 text-[11.5px] font-medium text-brand hover:bg-brand/25"
                    >
                      Promover
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Clientes interessados */}
          <section className="flex flex-col gap-3">
            <SectionTitle overline="Retorno" title="Clientes interessados" />
            <div className="glass rounded-3xl p-5">
              <p className="text-[14px] leading-snug">
                <span className="font-semibold">{totalTry.toLocaleString("pt-BR")}</span>{" "}
                {totalTry === 1 ? "pessoa experimentou" : "pessoas experimentaram"} nos últimos dias.
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                {Math.max(0, totalTry - totalBuys).toLocaleString("pt-BR")} saíram sem clicar em comprar.
              </p>
              <button
                onClick={onOpenInterested}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[12.5px] font-medium text-white active:scale-[0.98]"
              >
                Criar mensagem de retorno
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SectionTitle({
  overline,
  title,
  desc,
}: {
  overline: string;
  title: string;
  desc?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{overline}</p>
      <h2 className="mt-1 text-[16px] font-medium tracking-tight">{title}</h2>
      {desc && <p className="mt-1 text-[12px] text-muted-foreground">{desc}</p>}
    </div>
  );
}

function MiniInsight({
  label,
  value,
  tag,
  tone,
}: {
  label: string;
  value: string;
  tag: string;
  tone?: "up" | "down";
}) {
  const tagCls =
    tone === "up"
      ? "bg-emerald-500/15 text-emerald-300"
      : tone === "down"
        ? "bg-red-500/15 text-red-300"
        : "bg-brand/15 text-brand";
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-[14px] font-medium leading-tight">{value}</p>
      <span
        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium ${tagCls}`}
      >
        {tag}
      </span>
    </div>
  );
}

function ProductFunnel({ product }: { product: StudioProduct }) {
  const steps = [
    { label: "Visualizou", value: product.stats.views, Icon: Eye },
    { label: "Experimentou", value: product.stats.tryons, Icon: Sparkles },
    { label: "Salvou", value: product.stats.saves, Icon: Bookmark },
    { label: "Clicou em comprar", value: product.stats.buyClicks, Icon: ShoppingBag },
  ];
  const max = steps[0].value || 1;
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
          {product.image ? (
            <img
              src={product.image}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-4 w-4 text-white/30" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{product.name}</p>
          <p className="text-[10.5px] text-muted-foreground">{CATEGORY_LABEL[product.category]}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {steps.map((s) => {
          const pct = Math.max(6, Math.round((s.value / max) * 100));
          return (
            <div key={s.label} className="flex flex-col items-center gap-1.5">
              <div className="relative h-9 w-full overflow-hidden rounded-lg bg-white/[0.03]">
                <div
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand to-[#8f88ff]"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] font-medium tabular-nums">{s.value}</p>
              <p className="text-center text-[9px] leading-tight text-muted-foreground">
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── Store settings ─────────────────────────── */
function StorePage({
  store,
  loading,
}: {
  store: StoreProfile | null;
  loading: boolean;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6C63FF");
  const [wa, setWa] = useState("");
  const [ig, setIg] = useState("");
  const [site, setSite] = useState("");
  const [addr, setAddr] = useState("");
  const [physical, setPhysical] = useState(true);
  const [ecommerce, setEcommerce] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    setName(store.nome ?? "");
    setColor(store.cor ?? "#6C63FF");
    setWa(store.whatsapp ?? "");
    setIg(store.instagram ?? "");
    setSite(store.website ?? "");
    setAddr(store.endereco ?? "");
    setPhysical(store.physical_enabled);
    setEcommerce(store.ecommerce_enabled);
  }, [store]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateMyStore({
        nome: name.trim() || "Minha Loja",
        cor: color,
        whatsapp: wa.trim() || null,
        instagram: ig.trim() || null,
        website: site.trim() || null,
        endereco: addr.trim() || null,
        physical_enabled: physical,
        ecommerce_enabled: ecommerce,
      });
      await qc.invalidateQueries({ queryKey: ["store"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 px-5 pt-7 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Personalização
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.03em]">
          Minha loja
        </h1>
      </header>

      {loading && !store && (
        <p className="text-center text-[12px] text-muted-foreground">Carregando…</p>
      )}

      {/* Block: Canais */}
      <Block overline="Canais" title="Onde sua loja atende">
        <div className="glass flex flex-col divide-y divide-white/[0.06] rounded-2xl">
          <ChannelToggle
            label="Loja física"
            desc="Habilita QR Codes para vitrine, etiqueta e balcão."
            checked={physical}
            onChange={setPhysical}
          />
          <ChannelToggle
            label="Ecommerce"
            desc="Habilita link do provador para páginas de produto."
            checked={ecommerce}
            onChange={setEcommerce}
          />
        </div>
      </Block>

      {/* Block: Sua marca */}
      <Block overline="Bloco 1" title="Sua marca">
        <div className="glass overflow-hidden rounded-3xl">
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ background: `linear-gradient(135deg, ${color}22, transparent)` }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {(name || "M").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[13.5px] font-semibold">{name || "Minha Loja"}</p>
              <p className="text-[10.5px] text-muted-foreground">Provador virtual</p>
            </div>
          </div>
        </div>
        <Field label="Nome da loja" value={name} onChange={setName} />
        <div className="glass rounded-2xl p-4">
          <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
            Cor principal
          </label>
          <div className="mt-2.5 flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              aria-label="Cor principal"
            />
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="flex-1 rounded-lg bg-white/[0.03] px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>
      </Block>

      {/* Block: Contato */}
      <Block overline="Bloco 2" title="Contato">
        <Field label="WhatsApp" value={wa} onChange={setWa} placeholder="(11) 99999-9999" Icon={Phone} />
        <Field label="Instagram" value={ig} onChange={setIg} placeholder="@sualoja" Icon={Instagram} />
        <Field label="Link do site" value={site} onChange={setSite} placeholder="https://" Icon={Globe} />
      </Block>

      {/* Block: Endereço */}
      <Block overline="Bloco 3" title="Endereço">
        <Field label="Endereço físico" value={addr} onChange={setAddr} placeholder="Rua, número, cidade" Icon={MapPin} />
      </Block>

      {/* Block: Plano */}
      <Block overline="Bloco 4" title="Plano">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Atual</p>
            <p className="mt-2 text-[13px] font-medium">Powered by AuraFit</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Marca AuraFit visível</p>
          </div>
          <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-[#1a1436] to-[#111217] p-4">
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-brand/80">White Label</p>
            <ul className="mt-2 space-y-1 text-[11.5px] text-white/90">
              <li>Sua marca e logo</li>
              <li>Suas cores</li>
              <li>Link personalizado</li>
            </ul>
          </div>
        </div>
      </Block>

      {error && (
        <p className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11.5px] text-red-300">
          {error}
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-full bg-brand py-3 text-[13px] font-medium text-white transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {saving ? "Salvando…" : saved ? "Salvo" : "Salvar alterações"}
      </button>
    </div>
  );
}

function Block({
  overline,
  title,
  children,
}: {
  overline: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{overline}</p>
        <h2 className="mt-1 text-[16px] font-medium tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  Icon?: React.ElementType;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.6} />}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

function ChannelToggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 p-4">
      <div className="flex-1">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-brand" : "bg-white/[0.08]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  );
}

/* ─────────────────────────── Bottom nav ─────────────────────────── */
function StudioBottomNav({ current, onGo }: { current: Tab; onGo: (t: Tab) => void }) {
  const items: Array<{ tab: Tab; label: string; icon: React.ElementType }> = [
    { tab: "dashboard", label: "Painel", icon: LayoutDashboard },
    { tab: "produtos", label: "Produtos", icon: Package },
    { tab: "publicacao", label: "Publicação", icon: QrCode },
    { tab: "insights", label: "Insights", icon: BarChart3 },
    { tab: "loja", label: "Loja", icon: StoreIcon },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[480px] justify-center px-3 pb-3 pt-2"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass flex w-full items-center justify-between gap-0.5 rounded-full px-1.5 py-1.5">
        {items.map(({ tab, label, icon: Icon }) => {
          const active = current === tab;
          return (
            <button
              key={tab}
              onClick={() => onGo(tab)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-1.5 py-2 text-[9.5px] font-medium transition-colors ${
                active ? "text-brand" : "text-muted-foreground"
              }`}
              aria-label={label}
            >
              <Icon className="h-4 w-4" strokeWidth={1.7} />
              <span className="leading-none">{label}</span>
              {active && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-brand" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ─────────────────────────── Import modal ─────────────────────────── */
type ImportStep = "upload" | "analyzing" | "issues" | "review";
function ImportModal({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (rows: CatalogRow[]) => Promise<void>;
}) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const issues = useMemo(() => {
    const noImage = rows.filter((r) => r.status === "sem-imagem").length;
    const badPrice = rows.filter((r) => !(r.price > 0)).length;
    return { noImage, badPrice, unknownCat: 0 };
  }, [rows]);

  async function beginAnalysis(file: File) {
    setFileError(null);
    if (!isSupportedSpreadsheet(file)) {
      setFileError("Envie uma planilha do Excel (.xlsx) ou um arquivo .csv.");
      return;
    }
    setStep("analyzing");
    setProgress(0);
    try {
      const parsed = await parseSpreadsheetFile(file);
      const catalog: CatalogRow[] = parsed.map((p, idx) => {
        const sizes = new Set<string>(p.sizes);
        for (const v of p.variants) for (const s of v.sizes) sizes.add(s);
        return {
          id: `row-${idx}-${Date.now()}`,
          name: p.name,
          category: p.category,
          price: p.price,
          sku: p.sku,
          image: p.image,
          buyUrl: p.buyUrl,
          status: p.image && p.image.trim() ? (p.price > 0 ? "pronto" : "revisar") : "sem-imagem",
          variantCount: p.variants.length,
          sizeCount: sizes.size,
          source: p,
        };
      });
      setRows(catalog);
      setProgress(1);
      await new Promise((r) => setTimeout(r, 400));
      setProgress(2);
      await new Promise((r) => setTimeout(r, 300));
      const hasIssues = catalog.some((r) => r.status !== "pronto") || catalog.some((r) => !(r.price > 0));
      setStep(catalog.length === 0 ? "upload" : hasIssues ? "issues" : "review");
      if (catalog.length === 0) setFileError("Nenhum produto encontrado no arquivo.");
    } catch (err) {
      console.error(err);
      setFileError("Não conseguimos ler este arquivo. Verifique se é uma planilha válida.");
      setStep("upload");
    }
  }


  return (
    <Modal onClose={onClose} title="Importar catálogo">
      {step === "upload" && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted-foreground">
            Arraste uma planilha ou selecione um arquivo. O AuraFit analisa automaticamente.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) beginAnalysis(f);
            }}
            className={`glass flex flex-col items-center justify-center gap-3 rounded-3xl border-dashed py-12 transition-all ${
              dragOver ? "border-brand/60 bg-brand/[0.06]" : "hover:border-white/[0.14]"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 ring-1 ring-brand/30">
              <Upload className="h-5 w-5 text-brand" strokeWidth={1.7} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium">Arraste uma planilha</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">ou selecionar arquivo</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground">
                Excel
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground">
                CSV
              </span>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,.xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) beginAnalysis(f);
            }}
          />

          {fileError && (
            <p className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11.5px] text-red-300">
              {fileError}
            </p>
          )}
          <p className="text-center text-[10.5px] text-muted-foreground">
            Cabeçalhos aceitos: nome, categoria, preco, descricao, imagem, sku, buy_url
          </p>
        </div>
      )}


      {step === "analyzing" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 ring-1 ring-brand/30">
            <Sparkles className="h-5 w-5 animate-pulse text-brand" strokeWidth={1.7} />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-medium">
              {["Analisando planilha…", "Identificando produtos…", "Organizando catálogo…"][
                progress
              ] ?? "Organizando catálogo…"}
            </p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">Isso leva alguns segundos.</p>
          </div>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full bg-gradient-to-r from-brand to-[#8f88ff] transition-all"
              style={{ width: `${((progress + 1) / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {step === "issues" && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[14px] font-medium">
              Encontramos alguns itens que precisam de atenção.
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Nada é alterado sem sua confirmação.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            <IssueRow
              label="produtos sem imagem"
              count={issues.noImage}
              tone={issues.noImage ? "warn" : "ok"}
            />
            <IssueRow
              label="preços inválidos"
              count={issues.badPrice}
              tone={issues.badPrice ? "warn" : "ok"}
            />
            <IssueRow
              label="categorias desconhecidas"
              count={issues.unknownCat}
              tone={issues.unknownCat ? "warn" : "ok"}
            />
          </ul>
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => setStep("review")}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12.5px] font-medium text-white transition-transform active:scale-[0.98]"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
              Corrigir automaticamente
            </button>
            <button
              onClick={() => setStep("review")}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12.5px] font-medium hover:bg-white/[0.06]"
            >
              Revisar manualmente
            </button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[13px] font-medium">Revisar catálogo</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {rows.length} produtos encontrados. Confirme antes de publicar.
            </p>
          </div>
          <div className="flex max-h-[42vh] flex-col gap-2 overflow-y-auto">
            {rows.map((r) => (
              <div key={r.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
                  {r.image ? (
                    <img
                      src={r.image}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-3.5 w-3.5 text-white/30" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium">{r.name}</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {CATEGORY_LABEL[r.category]} · R$ {r.price.toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <StatusChip status={r.status} />
              </div>
            ))}
          </div>
          {publishError && (
            <p className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11.5px] text-red-300">
              {publishError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setRows((s) => s.filter((r) => r.status !== "sem-imagem"))}
              disabled={publishing}
              className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium hover:bg-white/[0.06] disabled:opacity-60"
            >
              Remover incompletos
            </button>
            <button
              onClick={async () => {
                if (publishing || rows.length === 0) return;
                setPublishError(null);
                setPublishing(true);
                try {
                  await onPublish(rows);
                } catch (err) {
                  console.error(err);
                  setPublishError(
                    err instanceof Error && err.message
                      ? err.message
                      : "Não foi possível publicar seu catálogo. Tente novamente.",
                  );
                } finally {
                  setPublishing(false);
                }
              }}
              disabled={publishing || rows.length === 0}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12px] font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {publishing ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" strokeWidth={1.8} />
                  Publicando…
                </>
              ) : (
                <>
                  Publicar
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function IssueRow({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "warn" | "ok";
}) {
  const cls =
    tone === "warn"
      ? "bg-amber-500/10 text-amber-300 ring-amber-400/20"
      : "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20";
  const Icon = tone === "warn" ? AlertTriangle : Check;
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${cls}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
      <p className="text-[12.5px]">
        <span className="font-semibold tabular-nums">{count}</span>{" "}
        <span className="opacity-90">{label}</span>
      </p>
    </li>
  );
}

function StatusChip({ status }: { status: CatalogRow["status"] }) {
  const map = {
    pronto: { label: "Pronto", cls: "bg-emerald-500/15 text-emerald-300" },
    revisar: { label: "Revisar", cls: "bg-amber-500/15 text-amber-300" },
    "sem-imagem": { label: "Sem imagem", cls: "bg-red-500/15 text-red-300" },
  } as const;
  const s = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>{s.label}</span>
  );
}

/* ─────────────────────────── QR modal ─────────────────────────── */
function QrModal({
  product,
  storeName,
  onClose,
}: {
  product: StudioProduct;
  storeName: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const link = product.qrToken ? tryOnUrl(product.qrToken) : "";

  useEffect(() => {
    if (product.qrToken) generateQrDataUrl(product.qrToken).then(setQrSrc).catch(() => setQrSrc(null));
  }, [product.qrToken]);

  function copyLink() {
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function printLabel() {
    if (!qrSrc) return;
    const priceHtml = product.price > 0
      ? `<p class="price">R$ ${product.price.toFixed(2).replace(".", ",")}</p>`
      : "";
    const safeStore = (storeName ?? "AuraFit").replace(/[<>&]/g, "");
    const safeName = product.name.replace(/[<>&]/g, "");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>QR ${safeName}</title>
<style>
  @page { size: A4; margin: 24mm; }
  html, body { background:#fff; color:#000; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; }
  .label { max-width: 360px; margin: 0 auto; padding: 24px; text-align: center; border: 1px dashed #d0d0d0; border-radius: 16px; }
  .store { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #444; margin-bottom: 14px; }
  .qr { display:block; margin: 0 auto; width: 240px; height: 240px; image-rendering: crisp-edges; }
  h1 { font-size: 18px; margin: 18px 0 6px; font-weight: 600; }
  .price { font-size: 14px; color: #333; margin: 0 0 12px; }
  p.cta { font-size: 12px; color: #444; margin: 10px 0 0; line-height: 1.4; }
</style></head><body>
<div class="label">
  <div class="store">${safeStore}</div>
  <img class="qr" src="${qrSrc}" alt="QR ${safeName}" />
  <h1>${safeName}</h1>
  ${priceHtml}
  <p class="cta">Escaneie e veja como fica em você.</p>
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 60); };</script>
</body></html>`;
    const w = window.open("", "_blank", "width=480,height=720");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <Modal onClose={onClose} title="QR Code">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-2xl bg-white p-4">
          {qrSrc ? (
            <img src={qrSrc} alt={`QR ${product.name}`} width={168} height={168} />
          ) : (
            <div className="flex h-[168px] w-[168px] items-center justify-center text-xs text-muted-foreground">…</div>
          )}
        </div>
        <div className="text-center">
          <p className="text-[13px] font-medium">{product.name}</p>
          <p className="mt-1 break-all text-[11px] text-muted-foreground">{link}</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <ModalBtn Icon={Download} label="Baixar QR" primary onClick={() => product.qrToken && downloadQr(product.qrToken, `qr-${product.name}`)} />
          <ModalBtn Icon={Copy} label={copied ? "Copiado" : "Copiar link"} onClick={copyLink} />
          <ModalBtn Icon={Printer} label="Imprimir" onClick={printLabel} />
          <ModalBtn Icon={MessageCircle} label="WhatsApp" onClick={() => link && window.open(`https://wa.me/?text=${encodeURIComponent(`Experimente: ${link}`)}`, "_blank")} />
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────── Link modal ─────────────────────────── */
function LinkModal({ product, onClose }: { product: StudioProduct; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = product.qrToken ? tryOnUrl(product.qrToken) : "";

  function copyLink() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Modal onClose={onClose} title="Link do provador">
      <div className="flex flex-col gap-4">
        <p className="text-[12.5px] text-muted-foreground">
          Use este link na página do produto do seu ecommerce.
        </p>
        <div className="glass rounded-2xl p-4">
          <p className="text-[13px] font-medium">{product.name}</p>
          <p className="mt-2 break-all text-[12px] text-muted-foreground">{link}</p>
        </div>
        <button
          onClick={copyLink}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12.5px] font-medium text-white active:scale-[0.98]"
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
          {copied ? "Copiado" : "Copiar link"}
        </button>
      </div>
    </Modal>
  );
}

function ModalBtn({
  Icon,
  label,
  onClick,
  primary,
}: {
  Icon: React.ElementType;
  label: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[11.5px] font-medium transition-colors ${
        primary
          ? "bg-brand text-white hover:brightness-110"
          : "border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
      {label}
    </button>
  );
}

/* ─────────────────────────── Add product modal ─────────────────────────── */
function AddProductModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Omit<StudioProduct, "id" | "stats" | "status">) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<StudioCategory>("superior");
  const [image, setImage] = useState("");
  const [buyUrl, setBuyUrl] = useState("");
  const [sku, setSku] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isPro = PRO_CATEGORIES.includes(category);
  const valid = name.trim().length > 1 && Number(price) > 0 && !isPro && !uploading && !saving;

  async function handlePickFile(f: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadProductImage(f);
      setImage(url);
    } catch (e: any) {
      setUploadError(e?.message ?? "Falha no upload da imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!valid) return;
    setSubmitError(null);
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        price: Number(price),
        category,
        image: image.trim(),
        buyUrl: buyUrl.trim() || undefined,
        sku: sku.trim() || undefined,
      } as any);
    } catch (e: any) {
      setSubmitError(e?.message ?? "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const cats: Array<{ key: StudioCategory; label: string; pro?: boolean }> = [
    { key: "superior", label: "Superior" },
    { key: "inferior", label: "Inferior" },
    { key: "peca-unica", label: "Peça única" },
    { key: "calcados", label: "Calçados", pro: true },
    { key: "acessorios", label: "Acessórios", pro: true },
  ];

  return (
    <Modal onClose={onClose} title="Novo produto">
      <div className="flex flex-col gap-3">
        <MField label="Nome do produto" value={name} onChange={setName} placeholder="Ex: Jaqueta Jeans" />

        {/* Foto: upload + URL */}
        <div className="glass rounded-2xl p-3.5">
          <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
            Foto do produto
          </label>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
              {image ? (
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-4 w-4 text-white/30" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11.5px] font-medium hover:bg-white/[0.06] disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" strokeWidth={1.7} />
                {uploading ? "Enviando…" : image ? "Trocar foto" : "Enviar foto"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePickFile(f);
                }}
              />
            </div>
          </div>
          {uploadError && <p className="mt-2 text-[10.5px] text-red-300">{uploadError}</p>}
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="ou cole uma URL de imagem"
            className="mt-2 w-full rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="glass rounded-2xl p-3.5">
          <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
            Categoria
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cats.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                    active
                      ? "border-brand bg-brand/15 text-brand"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground"
                  }`}
                >
                  {c.label}
                  {c.pro && <Lock className="h-2.5 w-2.5" strokeWidth={2} />}
                </button>
              );
            })}
          </div>
          {isPro && (
            <p className="mt-2 text-[10.5px] text-brand/80">
              Calçados e Acessórios disponíveis no plano Pro.
            </p>
          )}
        </div>
        <MField label="Preço" value={price} onChange={setPrice} placeholder="0,00" type="number" />
        <MField label="Link de compra" value={buyUrl} onChange={setBuyUrl} placeholder="https://" />
        <MField label="SKU (opcional)" value={sku} onChange={setSku} placeholder="SKU-001" />
        {submitError && (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11.5px] text-red-300">
            {submitError}
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!valid}
          className="mt-2 rounded-full bg-brand py-3 text-[13px] font-medium text-white transition-transform active:scale-[0.99] disabled:opacity-40"
        >
          {saving ? "Salvando…" : "Salvar produto"}
        </button>
      </div>
    </Modal>
  );
}

function MField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

/* ─────────────────────────── Promote modal ─────────────────────────── */
function PromoteModal({ name, onClose }: { name: string; onClose: () => void }) {
  const msg = `Oi! Essa peça (${name}) acabou de entrar na loja e você pode ver como ela fica em você pelo nosso provador online.`;
  const [copied, setCopied] = useState(false);
  return (
    <Modal onClose={onClose} title="Promover produto">
      <div className="flex flex-col gap-4">
        <p className="text-[12.5px] text-muted-foreground">Sugestão de mensagem para WhatsApp:</p>
        <div className="glass rounded-2xl p-4">
          <p className="text-[13px] leading-relaxed">{msg}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(msg);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium hover:bg-white/[0.06]"
          >
            {copied ? "Copiado" : "Copiar mensagem"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12px] font-medium text-white active:scale-[0.98]"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.8} /> WhatsApp
          </a>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────── Interested modal ─────────────────────────── */
function InterestedModal({ onClose }: { onClose: () => void }) {
  const msg =
    "Oi! Vi que você experimentou essa peça no nosso provador. Quer que eu te ajude com tamanho, cor ou disponibilidade?";
  const [copied, setCopied] = useState(false);
  return (
    <Modal onClose={onClose} title="Mensagem de retorno">
      <div className="flex flex-col gap-4">
        <p className="text-[12.5px] text-muted-foreground">
          Envie para clientes que experimentaram mas não clicaram em comprar.
        </p>
        <div className="glass rounded-2xl p-4">
          <p className="text-[13px] leading-relaxed">{msg}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(msg);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium hover:bg-white/[0.06]"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12px] font-medium text-white active:scale-[0.98]"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.8} /> WhatsApp
          </a>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────── Modal shell ─────────────────────────── */
function Modal({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center">
      <div className="glass max-h-[90dvh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl border-t border-white/10 p-5 sm:rounded-3xl sm:border">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[15px] font-semibold tracking-tight">{title}</p>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
