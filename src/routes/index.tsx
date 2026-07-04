import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Home as HomeIcon,
  Shirt,
  User,
  Upload,
  Link2,
  ArrowRight,
  Bookmark,
  RefreshCw,
  Check,
  X,
  Image as ImageIcon,
  ChevronRight,
  Plus,
  Store,
  ShoppingBag,
  MessageCircle,
  QrCode,
  Tag,
  Footprints,
  Watch,
  Sparkles,
} from "lucide-react";
import { generateTryOnLook } from "@/lib/tryon.functions";
import beforeImg from "@/assets/before-model.jpg";
import afterImg from "@/assets/after-model.jpg";
import phoneMockup from "@/assets/phone-mockup.png";

export const Route = createFileRoute("/")({
  component: AuraFitApp,
});

type Screen = "home" | "tryon" | "loading" | "result" | "wardrobe" | "profile";
type ApiCategory = "tops" | "bottoms";
type UiCategory = "roupas" | "calcados" | "acessorios";
type SavedLook = { id: string; url: string; category: UiCategory; createdAt: number };

const STORAGE_KEY = "aurafit_looks";

function AuraFitApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  const [modelImage, setModelImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [garmentImageUrl, setGarmentImageUrl] = useState("");
  const [uiCategory, setUiCategory] = useState<UiCategory>("roupas");
  const [apiCategory, setApiCategory] = useState<ApiCategory>("tops");

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateFn = useServerFn(generateTryOnLook);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedLooks(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLooks)); } catch {}
  }, [savedLooks]);

  async function handleGenerate() {
    setErrorMessage(null);
    const model = modelImage;
    const garment = garmentImage || garmentImageUrl.trim();
    if (!model) return setErrorMessage("Envie uma foto sua.");
    if (!garment) return setErrorMessage("Envie a peça ou cole a URL.");

    setCurrentScreen("loading");
    try {
      const res = await generateFn({
        data: { model_image: model, garment_image: garment, category: apiCategory },
      });
      setGeneratedImage(res.imageUrl);
      setCurrentScreen("result");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Não foi possível gerar.");
      setCurrentScreen("tryon");
    }
  }

  function openTryOn(cat: UiCategory) {
    setUiCategory(cat);
    if (cat === "roupas") setApiCategory("tops");
    setCurrentScreen("tryon");
  }

  function saveCurrent() {
    if (!generatedImage) return;
    const item: SavedLook = { id: crypto.randomUUID(), url: generatedImage, category: uiCategory, createdAt: Date.now() };
    setSavedLooks((s) => [item, ...s]);
  }

  function resetTryOn() {
    setGeneratedImage(null);
    setGarmentImage(null);
    setGarmentImageUrl("");
    setErrorMessage(null);
    setCurrentScreen("tryon");
  }

  return (
    <div className="relative min-h-screen w-full text-foreground">
      <div className="grain-overlay" />
      <div className="relative z-[2] mx-auto flex min-h-screen w-full max-w-[440px] flex-col">
        {currentScreen === "home" && (
          <Home
            onStart={() => openTryOn("roupas")}
            onCategory={openTryOn}
          />
        )}
        {currentScreen === "tryon" && (
          <TryOn
            modelImage={modelImage}
            garmentImage={garmentImage}
            garmentImageUrl={garmentImageUrl}
            uiCategory={uiCategory}
            apiCategory={apiCategory}
            errorMessage={errorMessage}
            setModelImage={setModelImage}
            setGarmentImage={setGarmentImage}
            setGarmentImageUrl={setGarmentImageUrl}
            setUiCategory={setUiCategory}
            setApiCategory={setApiCategory}
            onSubmit={handleGenerate}
          />
        )}
        {currentScreen === "loading" && <LoadingScreen />}
        {currentScreen === "result" && generatedImage && (
          <Result
            image={generatedImage}
            original={modelImage}
            onSave={saveCurrent}
            onRetry={resetTryOn}
          />
        )}
        {currentScreen === "wardrobe" && (
          <Wardrobe looks={savedLooks} onDelete={(id) => setSavedLooks((s) => s.filter((l) => l.id !== id))} />
        )}
        {currentScreen === "profile" && <Profile lookCount={savedLooks.length} />}

        {currentScreen !== "loading" && (
          <BottomNav current={currentScreen} onGo={(s) => setCurrentScreen(s)} />
        )}
      </div>
    </div>
  );
}

/* ─────────── Home ─────────── */
function Home({
  onStart,
  onCategory,
}: {
  onStart: () => void;
  onCategory: (c: UiCategory) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-16 px-6 pt-14 pb-32 fade-in">
      {/* Hero */}
      <header className="fade-up">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-white/[0.02] px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          <span className="inline-block h-1 w-1 rounded-full bg-brand" />
          Provador Virtual
        </div>
        <h1 className="font-display text-[40px] font-semibold leading-[1.02] tracking-[-0.035em]">
          Veja como<br />a roupa fica<br />antes de comprar.
        </h1>
        <p className="mt-5 max-w-[300px] text-[15px] leading-relaxed text-muted-foreground">
          Experimente qualquer peça em segundos.
        </p>
        <button
          onClick={onStart}
          className="btn-brand mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium active:scale-[0.98] transition-transform"
        >
          Experimentar agora
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </header>

      {/* Before/After */}
      <section className="fade-up" style={{ animationDelay: "80ms" }}>
        <SectionLabel>Antes e depois</SectionLabel>
        <BeforeAfter before={beforeImg} after={afterImg} />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Arraste para comparar.
        </p>
      </section>

      {/* Como funciona */}
      <section className="fade-up" style={{ animationDelay: "120ms" }}>
        <SectionLabel>Como funciona</SectionLabel>
        <div className="flex flex-col gap-3">
          {[
            { n: "01", t: "Envie uma foto." },
            { n: "02", t: "Escolha uma roupa." },
            { n: "03", t: "Veja o resultado." },
          ].map((s) => (
            <div key={s.n} className="glass flex items-center gap-5 rounded-2xl px-5 py-4">
              <span className="font-display text-lg font-medium text-gradient-violet">{s.n}</span>
              <span className="text-[15px] font-medium text-foreground/95">{s.t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section className="fade-up" style={{ animationDelay: "160ms" }}>
        <SectionLabel>Categorias</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <CategoryCard icon={<Shirt className="h-5 w-5" strokeWidth={1.5} />} label="Roupas" active onClick={() => onCategory("roupas")} />
          <CategoryCard icon={<Footprints className="h-5 w-5" strokeWidth={1.5} />} label="Calçados" onClick={() => onCategory("calcados")} soon />
          <CategoryCard icon={<Watch className="h-5 w-5" strokeWidth={1.5} />} label="Acessórios" onClick={() => onCategory("acessorios")} soon />
        </div>
      </section>

      {/* Onde usar */}
      <section className="fade-up" style={{ animationDelay: "200ms" }}>
        <SectionLabel>Onde usar</SectionLabel>
        <div className="glass overflow-hidden rounded-3xl">
          {[
            { icon: Store, label: "Lojas físicas" },
            { icon: ShoppingBag, label: "E-commerce" },
            { icon: MessageCircle, label: "WhatsApp" },
            { icon: QrCode, label: "QR Code na vitrine" },
            { icon: Tag, label: "QR Code na etiqueta" },
          ].map(({ icon: Icon, label }, i, arr) => (
            <div
              key={label}
              className={`flex items-center gap-4 px-5 py-4 ${i < arr.length - 1 ? "border-b border-[color:var(--border)]" : ""}`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04]">
                <Icon className="h-4 w-4 text-white/85" strokeWidth={1.5} />
              </div>
              <span className="text-[14px] font-medium text-foreground/95">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Phone mockup */}
      <section className="fade-up" style={{ animationDelay: "240ms" }}>
        <div className="glass relative overflow-hidden rounded-[28px] px-6 pt-8 pb-0">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(141,103,255,0.35), transparent 70%)" }}
          />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Em qualquer tela</p>
            <h3 className="mt-2 font-display text-[22px] font-semibold leading-tight tracking-[-0.02em]">
              Simples no celular.<br />Poderoso na loja.
            </h3>
            <div className="mt-6 flex justify-center">
              <img
                src={phoneMockup}
                alt="Provador virtual em um celular"
                loading="lazy"
                className="h-[280px] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="pt-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">AuraFit · White Label</p>
      </footer>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
      {children}
    </p>
  );
}

function CategoryCard({
  icon,
  label,
  onClick,
  active,
  soon,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  soon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass relative flex flex-col items-start gap-5 rounded-2xl p-4 text-left transition-all active:scale-[0.97] hover:border-white/[0.10] ${active ? "border-[color:var(--brand)]/60" : ""}`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/90">
        {icon}
      </div>
      <span className="text-[13px] font-medium">{label}</span>
      {soon && (
        <span className="absolute right-3 top-3 text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
          em breve
        </span>
      )}
    </button>
  );
}

/* ─────────── Before / After slider ─────────── */
function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function updateFromClientX(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }

  return (
    <div
      ref={ref}
      className="glass relative aspect-[3/4] w-full overflow-hidden rounded-[28px] select-none touch-none"
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && updateFromClientX(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <img
        src={after}
        alt="Depois"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${pos}%` }}
      >
        <img
          src={before}
          alt="Antes"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ width: `${100 * (100 / Math.max(pos, 0.0001))}%`, maxWidth: "none" }}
          draggable={false}
        />
      </div>

      {/* Labels */}
      <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white/90 backdrop-blur-md">
        Antes
      </span>
      <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white/90 backdrop-blur-md">
        Depois
      </span>

      {/* Divider + handle */}
      <div
        className="absolute inset-y-0 w-[2px] bg-white/90 shadow-[0_0_20px_rgba(141,103,255,0.6)]"
        style={{ left: `calc(${pos}% - 1px)` }}
      />
      <div
        className="btn-brand absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20"
        style={{ left: `${pos}%` }}
      >
        <ChevronRight className="h-4 w-4 -translate-x-[7px]" strokeWidth={2} />
        <ChevronRight className="h-4 w-4 rotate-180 -translate-x-[9px]" strokeWidth={2} />
      </div>
    </div>
  );
}

/* ─────────── Try-on ─────────── */
function TryOn(props: {
  modelImage: string | null;
  garmentImage: string | null;
  garmentImageUrl: string;
  uiCategory: UiCategory;
  apiCategory: ApiCategory;
  errorMessage: string | null;
  setModelImage: (v: string | null) => void;
  setGarmentImage: (v: string | null) => void;
  setGarmentImageUrl: (v: string) => void;
  setUiCategory: (c: UiCategory) => void;
  setApiCategory: (c: ApiCategory) => void;
  onSubmit: () => void;
}) {
  const catLabel: Record<UiCategory, string> = {
    roupas: "Roupas",
    calcados: "Calçados",
    acessorios: "Acessórios",
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pt-14 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          {catLabel[props.uiCategory]}
        </p>
        <h1 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-0.03em]">
          Experimente em<br />segundos.
        </h1>
      </header>

      <ImageUpload
        label="1. Use sua foto"
        hint="Corpo inteiro, boa luz."
        value={props.modelImage}
        onChange={props.setModelImage}
      />

      <ImageUpload
        label="2. Escolha uma peça"
        hint="Upload ou URL abaixo."
        value={props.garmentImage}
        onChange={props.setGarmentImage}
      />

      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
        <Link2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <input
          type="url"
          inputMode="url"
          placeholder="Cole a URL da imagem"
          value={props.garmentImageUrl}
          onChange={(e) => props.setGarmentImageUrl(e.target.value)}
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {props.uiCategory === "roupas" && (
        <div>
          <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Parte da roupa</p>
          <div className="grid grid-cols-2 gap-2.5">
            {(["tops", "bottoms"] as const).map((c) => (
              <button
                key={c}
                onClick={() => props.setApiCategory(c)}
                className={`rounded-2xl border px-4 py-3.5 text-sm font-medium transition-all active:scale-[0.98] ${
                  props.apiCategory === c
                    ? "border-[color:var(--brand)] bg-white/[0.03] text-white"
                    : "border-[color:var(--border)] bg-[color:var(--surface)] text-foreground/70 hover:text-foreground"
                }`}
              >
                {c === "tops" ? "Parte de cima" : "Parte de baixo"}
              </button>
            ))}
          </div>
        </div>
      )}

      {props.errorMessage && (
        <div className="rounded-2xl border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/[0.08] px-4 py-3 text-sm text-white/90">
          {props.errorMessage}
        </div>
      )}

      <button
        onClick={props.onSubmit}
        className="btn-brand mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium active:scale-[0.98] transition-transform"
      >
        Gerar visual
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function ImageUpload({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  async function onFile(f: File) {
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(f);
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <div
        onClick={() => ref.current?.click()}
        className="glass group relative flex aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-3xl transition-all hover:border-white/[0.10]"
      >
        {value ? (
          <>
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
              <Upload className="h-4 w-4 text-white/85" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium">Toque para enviar</p>
            <p className="text-xs text-muted-foreground">JPG · PNG · até 10 MB</p>
          </div>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </div>
    </div>
  );
}

/* ─────────── Loading ─────────── */
function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 fade-in">
      <div className="glass shimmer flex h-72 w-56 items-center justify-center overflow-hidden rounded-3xl">
        <div className="shimmer-overlay" />
        <Sparkles className="h-6 w-6 text-white/70 pulse-soft" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <h2 className="font-display text-[22px] font-semibold tracking-tight">Gerando visual</h2>
        <p className="mt-2 text-sm text-muted-foreground">Alguns segundos.</p>
      </div>
    </div>
  );
}

/* ─────────── Result ─────────── */
function Result({
  image,
  original,
  onSave,
  onRetry,
}: {
  image: string;
  original: string | null;
  onSave: () => void;
  onRetry: () => void;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-1 flex-col gap-5 px-6 pt-14 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Resultado</p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight">Pronto.</h1>
      </header>

      {original ? (
        <BeforeAfter before={original} after={image} />
      ) : (
        <div className="glass overflow-hidden rounded-[28px]">
          <img src={image} alt="Visual gerado" className="h-auto w-full" />
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => { onSave(); setSaved(true); setTimeout(() => setSaved(false), 1600); }}
          className="glass inline-flex items-center justify-center gap-2 rounded-full px-4 py-3.5 text-sm font-medium active:scale-[0.98] transition-all hover:border-white/[0.10]"
        >
          {saved ? (
            <><Check className="h-4 w-4 text-[color:var(--success)]" strokeWidth={2} /> Salvo</>
          ) : (
            <><Bookmark className="h-4 w-4" strokeWidth={1.5} /> Salvar</>
          )}
        </button>
        <button onClick={onRetry} className="btn-brand inline-flex items-center justify-center gap-2 rounded-full px-4 py-3.5 text-sm font-medium active:scale-[0.98]">
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> Nova peça
        </button>
      </div>
    </div>
  );
}

/* ─────────── Wardrobe ─────────── */
function Wardrobe({ looks, onDelete }: { looks: SavedLook[]; onDelete: (id: string) => void }) {
  const [tab, setTab] = useState<"all" | UiCategory>("all");
  const filtered = tab === "all" ? looks : looks.filter((l) => l.category === tab);

  const tabs: Array<{ id: typeof tab; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "roupas", label: "Roupas" },
    { id: "calcados", label: "Calçados" },
    { id: "acessorios", label: "Acessórios" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pt-14 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Salvos</p>
        <h1 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-0.03em]">Seus visuais</h1>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all ${
              tab === t.id
                ? "border-[color:var(--brand)] bg-white/[0.03] text-white"
                : "border-[color:var(--border)] bg-[color:var(--surface)] text-foreground/60 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass mt-4 flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <ImageIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">Nada salvo por aqui</p>
          <p className="max-w-[220px] text-xs leading-relaxed text-muted-foreground">Gere um visual e salve para revisitar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((l) => (
            <div key={l.id} className="glass group relative overflow-hidden rounded-[20px] transition-all hover:border-white/[0.10]">
              <div className="aspect-[3/4] w-full">
                <img src={l.url} alt="Visual salvo" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
              </div>
              <div className="flex items-center justify-between px-3 py-3">
                <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{l.category}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(l.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              </div>
              <button
                onClick={() => onDelete(l.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 border border-white/10 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Profile ─────────── */
function Profile({ lookCount }: { lookCount: number }) {
  return (
    <div className="flex flex-1 flex-col gap-7 px-6 pt-14 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Loja</p>
        <h1 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-0.03em]">Sua conta</h1>
      </header>

      <div className="glass flex items-center gap-4 rounded-3xl p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
          <Store className="h-5 w-5 text-white/85" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium">Sua loja</p>
          <p className="mt-1 text-xs text-muted-foreground">{lookCount} visuais salvos</p>
        </div>
      </div>

      <div className="glass divide-y divide-[color:var(--border)] rounded-3xl overflow-hidden">
        {["Personalização da marca", "Integração WhatsApp", "QR Codes", "Central de ajuda"].map((item) => (
          <button key={item} className="flex w-full items-center justify-between px-5 py-4 text-sm text-foreground/90 hover:bg-white/[0.02] transition-colors">
            {item}
            <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        ))}
      </div>

      <p className="text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground">AuraFit · White Label</p>
    </div>
  );
}

/* ─────────── Bottom nav ─────────── */
function BottomNav({ current, onGo }: { current: Screen; onGo: (s: Screen) => void }) {
  const items: Array<{ screen: Screen; label: string; icon: React.ElementType }> = [
    { screen: "home", label: "Início", icon: HomeIcon },
    { screen: "tryon", label: "Experimentar", icon: Plus },
    { screen: "wardrobe", label: "Salvos", icon: Bookmark },
    { screen: "profile", label: "Loja", icon: User },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[440px] justify-center px-4 pb-4 pt-2"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass flex w-full items-center justify-around rounded-full px-2 py-2.5">
        {items.map((it) => {
          const active =
            current === it.screen ||
            (it.screen === "tryon" && (current === "loading" || current === "result"));
          const Icon = it.icon;
          return (
            <button
              key={it.screen}
              onClick={() => onGo(it.screen)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-1.5 text-[10px] font-medium transition-all ${
                active ? "text-white" : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.5} />
              <span className="tracking-wide">{it.label}</span>
              {active && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
