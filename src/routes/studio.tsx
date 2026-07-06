import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Package,
  QrCode,
  BarChart3,
  Store as StoreIcon,
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  Plus,
  Search,
  Download,
  Copy,
  Printer,
  MessageCircle,
  X,
  
  TrendingUp,
  Eye,
  Bookmark,
  ShoppingBag,
  Zap,
  Instagram,
  Globe,
  MapPin,
  Phone,
  Check,
  AlertTriangle,
  ImageOff,
  Lock,
} from "lucide-react";
import {
  MOCK_PRODUCTS,
  MOCK_IMPORT_ROWS,
  CATEGORY_LABEL,
  CATEGORY_INTEREST,
  FORGOTTEN,
  KPIS,
  PRO_CATEGORIES,
  WEEK_INSIGHTS,
  type StudioProduct,
  type StudioCategory,
  type CatalogRow,
} from "@/lib/studio-mock";

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

type Tab = "dashboard" | "produtos" | "qr" | "insights" | "loja";

/* ─────────────────────────── Root ─────────────────────────── */
function StudioApp() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [products, setProducts] = useState<StudioProduct[]>(MOCK_PRODUCTS);
  const [importOpen, setImportOpen] = useState(false);
  const [qrProduct, setQrProduct] = useState<StudioProduct | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [promoteName, setPromoteName] = useState<string | null>(null);
  const [interestedOpen, setInterestedOpen] = useState(false);

  function handleAddProduct(p: Omit<StudioProduct, "id" | "stats" | "status">) {
    const newP: StudioProduct = {
      ...p,
      id: crypto.randomUUID(),
      status: p.image ? "pronto" : "sem-imagem",
      stats: { views: 0, tryons: 0, saves: 0, buyClicks: 0 },
    };
    setProducts((s) => [newP, ...s]);
    setAddOpen(false);
  }

  function handlePublishImport(rows: CatalogRow[]) {
    const added: StudioProduct[] = rows.map((r) => ({
      id: crypto.randomUUID(),
      name: r.name,
      category: r.category,
      price: r.price,
      sku: r.sku,
      image: r.image ?? "",
      buyUrl: r.buyUrl,
      status: r.status,
      stats: { views: 0, tryons: 0, saves: 0, buyClicks: 0 },
    }));
    setProducts((s) => [...added, ...s]);
    setImportOpen(false);
    setTab("produtos");
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background pb-28">
      <StudioHeader />

      <main className="flex-1">
        {tab === "dashboard" && (
          <Dashboard
            onImport={() => setImportOpen(true)}
            onGoProducts={() => setTab("produtos")}
            onOpenInterested={() => setInterestedOpen(true)}
          />
        )}
        {tab === "produtos" && (
          <Products
            products={products}
            onImport={() => setImportOpen(true)}
            onAdd={() => setAddOpen(true)}
            onQr={(p) => setQrProduct(p)}
          />
        )}
        {tab === "qr" && <QrCodes products={products} onOpen={(p) => setQrProduct(p)} />}
        {tab === "insights" && (
          <Insights onPromote={(n) => setPromoteName(n)} onOpenInterested={() => setInterestedOpen(true)} />
        )}
        {tab === "loja" && <StorePage />}
      </main>

      <StudioBottomNav current={tab} onGo={setTab} />

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onPublish={handlePublishImport} />}
      {qrProduct && <QrModal product={qrProduct} onClose={() => setQrProduct(null)} />}
      {addOpen && <AddProductModal onClose={() => setAddOpen(false)} onSave={handleAddProduct} />}
      {promoteName && <PromoteModal name={promoteName} onClose={() => setPromoteName(null)} />}
      {interestedOpen && <InterestedModal onClose={() => setInterestedOpen(false)} />}
    </div>
  );
}

/* ─────────────────────────── Header ─────────────────────────── */
function StudioHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[color:var(--border)] bg-background/80 px-5 py-3.5 backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} />
        Modo Cliente
      </Link>
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-brand" strokeWidth={1.7} />
        <span className="text-[13px] font-medium tracking-tight">AuraFit Studio</span>
      </div>
      <div className="w-[92px] text-right">
        <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand">
          Business
        </span>
      </div>
    </header>
  );
}

/* ─────────────────────────── Dashboard ─────────────────────────── */
function Dashboard({
  onImport,
  onGoProducts,
  onOpenInterested,
}: {
  onImport: () => void;
  onGoProducts: () => void;
  onOpenInterested: () => void;
}) {
  return (
    <div className="flex flex-col gap-7 px-5 pt-7 fade-in">
      <section>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">AuraFit Studio</p>
        <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">
          Faça seus clientes<br />experimentarem antes de comprar.
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          ERP controla estoque. <span className="text-foreground">AuraFit faz vender o estoque.</span>
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <Kpi label="Visualizações" value={KPIS.views.toLocaleString("pt-BR")} icon={Eye} />
        <Kpi label="Looks gerados" value={KPIS.looks.toLocaleString("pt-BR")} icon={Sparkles} />
        <Kpi label="Produtos experimentados" value={KPIS.triedProducts.toLocaleString("pt-BR")} icon={Package} />
        <Kpi label="Cliques em comprar" value={KPIS.buyClicks.toLocaleString("pt-BR")} icon={ShoppingBag} />
        <Kpi
          label="Vendas estimadas"
          value={`R$ ${KPIS.estimatedSalesBRL.toLocaleString("pt-BR")}`}
          icon={TrendingUp}
          highlight
          wide
        />
        <Kpi label="Taxa de intenção" value={`${KPIS.intentRatePct}%`} icon={Zap} wide />
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <ActionCard title="Importar catálogo" desc="Envie planilha e publique" onClick={onImport} icon={Upload} />
        <ActionCard title="Ver produtos" desc={`${KPIS.triedProducts} experimentados`} onClick={onGoProducts} icon={Package} />
      </section>

      <section className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Clientes interessados</p>
          <span className="text-[10px] text-brand">Hoje</span>
        </div>
        <p className="mt-3 text-[15px] leading-snug">
          <span className="font-semibold">57 pessoas</span> experimentaram uma camiseta hoje.<br />
          <span className="text-muted-foreground">19 saíram sem clicar em comprar.</span>
        </p>
        <button
          onClick={onOpenInterested}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[12.5px] font-medium text-white transition-transform active:scale-[0.98]"
        >
          Criar mensagem de retorno
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </section>

      <p className="pb-4 text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Powered by AuraFit
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  highlight,
  wide,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  highlight?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`glass relative overflow-hidden rounded-3xl p-4 ${wide ? "col-span-1" : ""} ${
        highlight ? "bg-gradient-to-br from-[#1a1436] to-[#111217]" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <Icon className={`h-3.5 w-3.5 ${highlight ? "text-brand" : "text-white/50"}`} strokeWidth={1.7} />
      </div>
      <p className={`mt-2.5 font-display text-[22px] font-semibold tracking-tight ${highlight ? "text-white" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  onClick,
  icon: Icon,
}: {
  title: string;
  desc: string;
  onClick: () => void;
  icon: React.ElementType;
}) {
  return (
    <button
      onClick={onClick}
      className="glass group flex flex-col items-start gap-3 rounded-3xl p-4 text-left transition-all active:scale-[0.98] hover:border-white/[0.10]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 ring-1 ring-brand/20">
        <Icon className="h-4 w-4 text-brand" strokeWidth={1.7} />
      </div>
      <div>
        <p className="text-[13.5px] font-medium">{title}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

/* ─────────────────────────── Products ─────────────────────────── */
function Products({
  products,
  onImport,
  onAdd,
  onQr,
}: {
  products: StudioProduct[];
  onImport: () => void;
  onAdd: () => void;
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
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.03em]">Produtos</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onImport}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11.5px] font-medium hover:bg-white/[0.06] transition-colors"
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
          <ProductCard key={p.id} product={p} onQr={() => onQr(p)} />
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

function ProductCard({ product, onQr }: { product: StudioProduct; onQr: () => void }) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="relative aspect-[4/5] bg-white/[0.03]">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-6 w-6 text-white/30" strokeWidth={1.5} />
          </div>
        )}
        <StatusPill status={product.status} />
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div>
          <p className="truncate text-[12.5px] font-medium">{product.name}</p>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">{CATEGORY_LABEL[product.category]}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-semibold">R$ {product.price.toFixed(2).replace(".", ",")}</p>
          <button
            onClick={onQr}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] text-foreground/80 hover:bg-white/[0.06]"
            aria-label="Gerar QR Code"
          >
            <QrCode className="h-3 w-3" strokeWidth={1.7} /> QR
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: StudioProduct["status"] }) {
  const map = {
    pronto: { label: "Pronto", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30", Icon: Check },
    revisar: { label: "Revisar", cls: "bg-amber-500/15 text-amber-300 ring-amber-400/30", Icon: AlertTriangle },
    "sem-imagem": { label: "Sem imagem", cls: "bg-red-500/15 text-red-300 ring-red-400/30", Icon: ImageOff },
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

/* ─────────────────────────── QR Codes ─────────────────────────── */
function QrCodes({ products, onOpen }: { products: StudioProduct[]; onOpen: (p: StudioProduct) => void }) {
  return (
    <div className="flex flex-col gap-5 px-5 pt-7 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Provador na loja</p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.03em]">QR Codes</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Use QR Codes na vitrine, etiqueta, cabide ou balcão. O cliente escaneia e experimenta a peça na hora.
        </p>
      </header>

      <div className="glass rounded-3xl p-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Exemplo de etiqueta</p>
        <div className="mt-3 flex items-center gap-4 rounded-2xl bg-white p-4 text-black">
          <FakeQr seed="demo" size={72} />
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider">AuraFit</p>
            <p className="mt-1 text-[13.5px] font-medium leading-tight">
              Escaneie e veja<br />como fica em você.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p)}
            className="glass flex items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.99] hover:border-white/[0.10]"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
              {p.image ? (
                <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-4 w-4 text-white/30" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-medium">{p.name}</p>
              <p className="text-[10.5px] text-muted-foreground">
                {CATEGORY_LABEL[p.category]} · R$ {p.price.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[10.5px] font-medium text-brand">
              <QrCode className="h-3 w-3" strokeWidth={1.8} /> Gerar QR
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FakeQr({ seed, size = 160 }: { seed: string; size?: number }) {
  // Deterministic pseudo-QR pattern purely for visual demo.
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
      r >= br && r < br + 7 && c >= bc && c < bc + 7 &&
      !(r > br && r < br + 6 && c > bc && c < bc + 6 && (r === br + 1 || r === br + 5 || c === bc + 1 || c === bc + 5));
    return inBox(0, 0) || inBox(0, cells - 7) || inBox(cells - 7, 0);
  };
  const inFinderBox = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-md" aria-hidden>
      <rect width={size} height={size} fill="#fff" />
      {Array.from({ length: cells }).map((_, r) =>
        Array.from({ length: cells }).map((_, c) => {
          if (inFinderBox(r, c)) {
            return isFinder(r, c) ? (
              <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#000" />
            ) : null;
          }
          return grid[r * cells + c] ? (
            <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#000" />
          ) : null;
        }),
      )}
    </svg>
  );
}

/* ─────────────────────────── Insights ─────────────────────────── */
function Insights({
  onPromote,
  onOpenInterested,
}: {
  onPromote: (name: string) => void;
  onOpenInterested: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 px-5 pt-7 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Resumo da semana</p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.03em]">Insights</h1>
      </header>

      {/* Week resume */}
      <section className="grid grid-cols-2 gap-2.5">
        <MiniInsight
          label="Mais experimentado"
          value={WEEK_INSIGHTS.topProduct.name}
          tag={`+${WEEK_INSIGHTS.topProduct.growthPct}%`}
          tone="up"
        />
        <MiniInsight
          label="Categoria em alta"
          value={WEEK_INSIGHTS.hotCategory.name}
          tag={`${WEEK_INSIGHTS.hotCategory.sharePct}%`}
        />
        <MiniInsight
          label="Produto esquecido"
          value={WEEK_INSIGHTS.forgotten.name}
          tag={`${WEEK_INSIGHTS.forgotten.tests} testes`}
          tone="down"
        />
        <div className="glass col-span-1 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#1a1436] to-[#111217] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-brand/80">Recomendação</p>
          <p className="mt-2 text-[12px] leading-snug text-white/90">{WEEK_INSIGHTS.recommendation}</p>
        </div>
      </section>

      <div className="flex gap-2">
        <button className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12.5px] font-medium hover:bg-white/[0.06]">
          Copiar resumo
        </button>
        <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12.5px] font-medium text-white active:scale-[0.98] transition-transform">
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.8} /> Enviar no WhatsApp
        </button>
      </div>

      {/* Product funnel */}
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Desempenho</p>
          <h2 className="mt-1 text-[16px] font-medium tracking-tight">Funil dos produtos</h2>
        </div>
        {MOCK_PRODUCTS.slice(0, 3).map((p) => (
          <ProductFunnel key={p.id} product={p} />
        ))}
      </section>

      {/* Category interest */}
      <section className="glass rounded-3xl p-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Interesse por categoria</p>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          Veja quais categorias seus clientes mais experimentam.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {CATEGORY_INTEREST.map((c) => (
            <div key={c.label}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span>{c.label}</span>
                <span className="text-muted-foreground">{c.pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-[#8f88ff]"
                  style={{ width: `${c.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Forgotten products */}
      <section>
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Produtos esquecidos</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">Pouca ou nenhuma experimentação.</p>
        </div>
        <div className="flex flex-col gap-2">
          {FORGOTTEN.map((f) => (
            <div key={f.name} className="glass flex items-center justify-between rounded-2xl p-4">
              <div>
                <p className="text-[13px] font-medium">{f.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {f.tests} {f.tests === 1 ? "teste" : "testes"} nos últimos 7 dias
                </p>
              </div>
              <button
                onClick={() => onPromote(f.name)}
                className="rounded-full bg-brand/15 px-3 py-1.5 text-[11.5px] font-medium text-brand hover:bg-brand/25"
              >
                Promover
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Interested customers */}
      <section className="glass rounded-3xl p-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Clientes interessados</p>
        <p className="mt-3 text-[14px] leading-snug">
          <span className="font-semibold">57 pessoas</span> experimentaram esta camiseta hoje.
        </p>
        <p className="text-[12.5px] text-muted-foreground">19 saíram sem clicar em comprar.</p>
        <button
          onClick={onOpenInterested}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[12.5px] font-medium text-white active:scale-[0.98]"
        >
          Criar mensagem de retorno
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </section>
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
      <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium ${tagCls}`}>{tag}</span>
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
          <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-[13px] font-medium">{product.name}</p>
          <p className="text-[10.5px] text-muted-foreground">{CATEGORY_LABEL[product.category]}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {steps.map((s) => {
          const pct = Math.max(6, Math.round((s.value / max) * 100));
          return (
            <div key={s.label} className="flex flex-col items-center gap-1.5">
              <div className="relative h-14 w-full overflow-hidden rounded-lg bg-white/[0.03]">
                <div
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand to-[#8f88ff]"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] font-medium tabular-nums">{s.value}</p>
              <p className="text-center text-[9px] leading-tight text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── Store settings ─────────────────────────── */
function StorePage() {
  const [name, setName] = useState("Minha Loja");
  const [color, setColor] = useState("#6C63FF");
  const [wa, setWa] = useState("");
  const [ig, setIg] = useState("");
  const [site, setSite] = useState("");
  const [addr, setAddr] = useState("");

  return (
    <div className="flex flex-col gap-6 px-5 pt-7 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Personalização</p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.03em]">Minha loja</h1>
      </header>

      {/* Preview */}
      <div className="glass overflow-hidden rounded-3xl">
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ background: `linear-gradient(135deg, ${color}22, transparent)` }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-white text-sm font-semibold"
            style={{ backgroundColor: color }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[13.5px] font-semibold">{name || "Minha Loja"}</p>
            <p className="text-[10.5px] text-muted-foreground">Provador virtual</p>
          </div>
        </div>
        <div className="border-t border-[color:var(--border)] px-5 py-3">
          <p className="text-[10.5px] text-muted-foreground">
            No plano White Label, a experiência aparece com a marca da sua loja.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Field label="Nome da loja" value={name} onChange={setName} />
        <div className="glass rounded-2xl p-4">
          <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Cor principal</label>
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
        <Field label="WhatsApp" value={wa} onChange={setWa} placeholder="(11) 99999-9999" Icon={Phone} />
        <Field label="Instagram" value={ig} onChange={setIg} placeholder="@sualoja" Icon={Instagram} />
        <Field label="Link do site" value={site} onChange={setSite} placeholder="https://" Icon={Globe} />
        <Field label="Endereço físico" value={addr} onChange={setAddr} placeholder="Rua, número, cidade" Icon={MapPin} />
      </div>

      {/* White label plans */}
      <section className="glass rounded-3xl p-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">White Label</p>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          White Label significa que o cliente vê a marca da sua loja, não a marca AuraFit.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Plano básico</p>
            <p className="mt-2 text-[13px] font-medium">Powered by AuraFit</p>
          </div>
          <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-[#1a1436] to-[#111217] p-4">
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-brand/80">White Label</p>
            <ul className="mt-2 space-y-1 text-[12px] text-white/90">
              <li>Marca e logo da loja</li>
              <li>Cores da loja</li>
              <li>Link personalizado</li>
              <li>QR Codes com sua marca</li>
            </ul>
          </div>
        </div>
      </section>

      <button className="rounded-full bg-brand py-3 text-[13px] font-medium text-white active:scale-[0.99] transition-transform">
        Salvar alterações
      </button>
    </div>
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
      <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">{label}</label>
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

/* ─────────────────────────── Bottom nav ─────────────────────────── */
function StudioBottomNav({ current, onGo }: { current: Tab; onGo: (t: Tab) => void }) {
  const items: Array<{ tab: Tab; label: string; icon: React.ElementType }> = [
    { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { tab: "produtos", label: "Produtos", icon: Package },
    { tab: "qr", label: "QR Codes", icon: QrCode },
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
type ImportStep = "upload" | "analyzing" | "organize" | "review";
function ImportModal({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (rows: CatalogRow[]) => void;
}) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<CatalogRow[]>(MOCK_IMPORT_ROWS);
  const fileRef = useRef<HTMLInputElement>(null);

  function beginAnalysis(name: string) {
    void name;
    setStep("analyzing");
    setProgress(0);
    const stages = [
      { label: "Analisando planilha…", ms: 700 },
      { label: "Identificando produtos…", ms: 900 },
      { label: "Organizando catálogo…", ms: 800 },
    ];
    let i = 0;
    const next = () => {
      if (i >= stages.length) {
        setStep("organize");
        return;
      }
      setProgress(i);
      setTimeout(() => {
        i += 1;
        next();
      }, stages[i].ms);
    };
    next();
  }

  return (
    <Modal onClose={onClose} title="Importar catálogo">
      {step === "upload" && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted-foreground">
            Envie sua planilha e o AuraFit organiza os produtos para você.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="glass flex flex-col items-center justify-center gap-3 rounded-3xl border-dashed py-10 transition-colors hover:border-white/[0.14]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/15 ring-1 ring-brand/30">
              <Upload className="h-4 w-4 text-brand" strokeWidth={1.7} />
            </div>
            <div className="text-center">
              <p className="text-[13.5px] font-medium">Arraste sua planilha aqui</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">ou clique para enviar</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground">.xlsx</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground">.csv</span>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) beginAnalysis(f.name);
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => beginAnalysis("planilha.xlsx")}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11.5px] font-medium hover:bg-white/[0.06]"
            >
              <FileSpreadsheet className="mr-1 inline h-3.5 w-3.5" strokeWidth={1.6} /> Excel
            </button>
            <button
              onClick={() => beginAnalysis("catalogo.csv")}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11.5px] font-medium hover:bg-white/[0.06]"
            >
              CSV
            </button>
          </div>
          <button
            onClick={() => setStep("organize")}
            className="text-center text-[11.5px] text-muted-foreground hover:text-foreground"
          >
            Importar manualmente
          </button>
        </div>
      )}

      {step === "analyzing" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 ring-1 ring-brand/30">
            <Sparkles className="h-5 w-5 animate-pulse text-brand" strokeWidth={1.7} />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-medium">
              {["Analisando planilha…", "Identificando produtos…", "Organizando catálogo…"][progress] ??
                "Organizando catálogo…"}
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

      {step === "organize" && (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-muted-foreground">Como deseja organizar?</p>
          <button
            onClick={() => setStep("review")}
            className="glass flex items-start gap-3 rounded-2xl p-4 text-left transition-all active:scale-[0.99] hover:border-white/[0.10]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 ring-1 ring-brand/30">
              <Sparkles className="h-4 w-4 text-brand" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-[13px] font-medium">Organizar automaticamente</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                O AuraFit tenta identificar nomes, categorias, imagens e preços.
              </p>
            </div>
          </button>
          <button
            onClick={() => setStep("review")}
            className="glass flex items-start gap-3 rounded-2xl p-4 text-left transition-all active:scale-[0.99] hover:border-white/[0.10]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
              <Check className="h-4 w-4 text-foreground/85" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-[13px] font-medium">Revisar manualmente</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                Você confere e ajusta tudo antes de publicar.
              </p>
            </div>
          </button>
          <p className="text-center text-[10.5px] text-muted-foreground">
            A IA nunca publica sem sua revisão.
          </p>
        </div>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[13px] font-medium">Revisar catálogo</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {rows.length} produtos encontrados. Ajuste antes de publicar.
            </p>
          </div>
          <div className="flex max-h-[42vh] flex-col gap-2 overflow-y-auto">
            {rows.map((r) => (
              <div key={r.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
                  {r.image ? (
                    <img src={r.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-3.5 w-3.5 text-white/30" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[12.5px] font-medium">{r.name}</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {CATEGORY_LABEL[r.category]} · R$ {r.price.toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <StatusChip status={r.status} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setRows((s) => s.filter((r) => r.status !== "sem-imagem"))}
              className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium hover:bg-white/[0.06]"
            >
              Remover incompletos
            </button>
            <button
              onClick={() => onPublish(rows)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12px] font-medium text-white active:scale-[0.98] transition-transform"
            >
              Publicar catálogo
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function StatusChip({ status }: { status: CatalogRow["status"] }) {
  const map = {
    pronto: { label: "Pronto", cls: "bg-emerald-500/15 text-emerald-300" },
    revisar: { label: "Revisar", cls: "bg-amber-500/15 text-amber-300" },
    "sem-imagem": { label: "Sem imagem", cls: "bg-red-500/15 text-red-300" },
  } as const;
  const s = map[status];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>{s.label}</span>;
}

/* ─────────────────────────── QR modal ─────────────────────────── */
function QrModal({ product, onClose }: { product: StudioProduct; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = `https://aurafit.app/try/${product.id}`;

  function copyLink() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Modal onClose={onClose} title="QR Code gerado">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-2xl bg-white p-4">
          <FakeQr seed={product.id} size={168} />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-medium">{product.name}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{link}</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <ModalBtn Icon={Download} label="Baixar QR" />
          <ModalBtn Icon={Copy} label={copied ? "Copiado" : "Copiar link"} onClick={copyLink} />
          <ModalBtn Icon={MessageCircle} label="WhatsApp" />
          <ModalBtn Icon={Printer} label="Imprimir etiqueta" />
        </div>
        <div className="w-full rounded-2xl bg-white p-3 text-black">
          <div className="flex items-center gap-3">
            <FakeQr seed={product.id} size={56} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">AuraFit</p>
              <p className="text-[12px] font-medium leading-tight">
                Escaneie e veja<br />como fica em você.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ModalBtn({ Icon, label, onClick }: { Icon: React.ElementType; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11.5px] font-medium hover:bg-white/[0.06]"
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
  const [wa, setWa] = useState("");
  const [sku, setSku] = useState("");

  const isPro = PRO_CATEGORIES.includes(category);
  const valid = name.trim().length > 1 && Number(price) > 0 && !isPro;

  function handleSubmit() {
    if (!valid) return;
    onSave({
      name: name.trim(),
      price: Number(price),
      category,
      image: image.trim(),
      buyUrl: buyUrl.trim() || undefined,
      sku: sku.trim() || undefined,
    });
    void wa;
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
        <MField label="Foto (URL)" value={image} onChange={setImage} placeholder="https://…" />
        <div className="glass rounded-2xl p-3.5">
          <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Categoria</label>
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
        <MField label="WhatsApp da loja" value={wa} onChange={setWa} placeholder="(11) 99999-9999" />
        <MField label="SKU (opcional)" value={sku} onChange={setSku} placeholder="SKU-001" />
        <button
          onClick={handleSubmit}
          disabled={!valid}
          className="mt-2 rounded-full bg-brand py-3 text-[13px] font-medium text-white active:scale-[0.99] transition-transform disabled:opacity-40"
        >
          Salvar produto
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
      <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">{label}</label>
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
