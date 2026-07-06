import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Home as HomeIcon,
  Shirt,
  User,
  Upload,
  Camera,
  ImagePlus,
  Link2,
  ArrowRight,
  Bookmark,
  Check,
  X,
  Image as ImageIcon,
  ChevronRight,
  Plus,
  Footprints,
  Watch,
  Sparkles,
  Lock,
  Share2,
  ShoppingBag,
  HelpCircle,
  Shield,
  LogOut,
  Images,
  QrCode,
  Store,

} from "lucide-react";
import { generateTryOnLook } from "@/lib/tryon.functions";
import ba1Before from "@/assets/ba-1-before.jpg";
import ba1After from "@/assets/ba-1-after.jpg";
import ba2Before from "@/assets/ba-2-before.jpg";
import ba2After from "@/assets/ba-2-after.jpg";

const BA_PAIRS: Array<{ before: string; after: string; label: string }> = [
  { before: ba1Before, after: ba1After, label: "Camiseta básica" },
  { before: ba2Before, after: ba2After, label: "Jaqueta aplicada" },
];

export const Route = createFileRoute("/")({
  component: AuraFitApp,
});

/* ─────────── White-label config (placeholder) ─────────── */
type StoreConfig = {
  storeName?: string;
  storeLogo?: string;
  storePrimaryColor?: string;
  storeWhatsApp?: string;
  storeCatalog?: Array<{ id: string; name: string; image: string; buyUrl?: string }>;
};
const STORE: StoreConfig = {};

type Screen = "home" | "tryon" | "loading" | "result" | "wardrobe" | "profile";
type ApiCategory = "tops" | "bottoms";
type UiCategory = "superior" | "inferior" | "calcados" | "acessorios";
type SavedLook = {
  id: string;
  url: string;
  category: UiCategory;
  createdAt: number;
  buyUrl?: string;
};

const STORAGE_KEY = "aurafit_looks";
const PRO_CATS: UiCategory[] = ["calcados", "acessorios"];

function AuraFitApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  const [modelImage, setModelImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [garmentImageUrl, setGarmentImageUrl] = useState("");
  const [garmentBuyUrl, setGarmentBuyUrl] = useState("");
  const [uiCategory, setUiCategory] = useState<UiCategory>("superior");

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [proModal, setProModal] = useState(false);

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
    const trimmedUrl = garmentImageUrl.trim();
    if (trimmedUrl && !garmentImage) {
      if (trimmedUrl.length > 2048) return setErrorMessage("Link muito longo.");
      try {
        const u = new URL(trimmedUrl);
        if (u.protocol !== "https:") return setErrorMessage("Use um link https válido.");
      } catch {
        return setErrorMessage("Link inválido.");
      }
    }
    const garment = garmentImage || trimmedUrl;
    if (!model) return setErrorMessage("Envie sua foto.");
    if (!garment) return setErrorMessage("Envie a peça que deseja experimentar.");
    if (PRO_CATS.includes(uiCategory)) {
      setProModal(true);
      return;
    }
    const apiCategory: ApiCategory = uiCategory === "inferior" ? "bottoms" : "tops";

    setCurrentScreen("loading");
    try {
      const res = await generateFn({
        data: { model_image: model, garment_image: garment, category: apiCategory },
      });
      setGeneratedImage(res.imageUrl);
      // auto-save to history
      const item: SavedLook = {
        id: crypto.randomUUID(),
        url: res.imageUrl,
        category: uiCategory,
        createdAt: Date.now(),
        buyUrl: garmentBuyUrl.trim() || undefined,
      };
      setSavedLooks((s) => [item, ...s]);
      setCurrentScreen("result");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Não foi possível processar. Tente novamente.");
      setCurrentScreen("tryon");
    }
  }

  function openTryOn(cat: UiCategory) {
    if (PRO_CATS.includes(cat)) {
      setProModal(true);
      return;
    }
    setUiCategory(cat);
    setCurrentScreen("tryon");
  }

  function resetTryOn() {
    setGeneratedImage(null);
    setGarmentImage(null);
    setGarmentImageUrl("");
    setGarmentBuyUrl("");
    setErrorMessage(null);
    setCurrentScreen("tryon");
  }

  return (
    <div className="relative min-h-screen w-full text-foreground">
      <div className="grain-overlay" />
      <div className="relative z-[2] mx-auto flex min-h-screen w-full max-w-[440px] flex-col">
        {currentScreen === "home" && (
          <Home
            onStart={() => openTryOn("superior")}
            onCategory={openTryOn}
          />
        )}
        {currentScreen === "tryon" && (
          <TryOn
            modelImage={modelImage}
            garmentImage={garmentImage}
            garmentImageUrl={garmentImageUrl}
            garmentBuyUrl={garmentBuyUrl}
            uiCategory={uiCategory}
            errorMessage={errorMessage}
            setModelImage={setModelImage}
            setGarmentImage={setGarmentImage}
            setGarmentImageUrl={setGarmentImageUrl}
            setGarmentBuyUrl={setGarmentBuyUrl}
            setUiCategory={setUiCategory}
            onSubmit={handleGenerate}
            onPro={() => setProModal(true)}
          />
        )}
        {currentScreen === "loading" && <LoadingScreen />}
        {currentScreen === "result" && generatedImage && (
          <Result
            image={generatedImage}
            original={modelImage}
            buyUrl={garmentBuyUrl.trim() || undefined}
            onRetry={resetTryOn}
          />
        )}
        {currentScreen === "wardrobe" && (
          <Wardrobe
            looks={savedLooks}
            onDelete={(id) => setSavedLooks((s) => s.filter((l) => l.id !== id))}
            onPro={() => setProModal(true)}
          />
        )}
        {currentScreen === "profile" && <Profile lookCount={savedLooks.length} />}

        {currentScreen !== "loading" && (
          <BottomNav current={currentScreen} onGo={(s) => setCurrentScreen(s)} />
        )}

        {proModal && <ProModal onClose={() => setProModal(false)} />}
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
    <div className="flex flex-1 flex-col gap-14 px-6 pt-14 pb-32 fade-in">
      {/* Hero */}
      <header className="fade-up">
        <p className="text-[13px] font-medium text-muted-foreground">
          Veja como fica antes de comprar.
        </p>
        <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.05] tracking-[-0.035em]">
          Escolha uma roupa.<br />
          Use sua foto.<br />
          <span className="text-gradient-violet">Veja como ela fica.</span>
        </h1>
        <button
          onClick={onStart}
          className="btn-brand mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium active:scale-[0.98] transition-transform"
        >
          Ver como fica
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </header>

      {/* Before/After */}
      <section className="fade-up" style={{ animationDelay: "80ms" }}>
        <BeforeAfterShowcase />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Arraste para comparar.
        </p>
      </section>

      {/* Como funciona */}
      <section className="fade-up" style={{ animationDelay: "120ms" }}>
        <SectionLabel>Como funciona</SectionLabel>
        <div className="flex flex-col gap-3">
          {[
            { n: "01", t: "Escolha uma roupa." },
            { n: "02", t: "Use sua foto." },
            { n: "03", t: "Veja como ela fica." },
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
          <CategoryCard
            icon={<Shirt className="h-5 w-5" strokeWidth={1.5} />}
            label="Roupas"
            status="ativo"
            onClick={() => onCategory("superior")}
          />
          <CategoryCard
            icon={<Footprints className="h-5 w-5" strokeWidth={1.5} />}
            label="Calçados"
            status="pro"
            onClick={() => onCategory("calcados")}
          />
          <CategoryCard
            icon={<Watch className="h-5 w-5" strokeWidth={1.5} />}
            label="Acessórios"
            status="pro"
            onClick={() => onCategory("acessorios")}
          />
        </div>
      </section>

      <footer className="pt-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          {STORE.storeName ? STORE.storeName : "Powered by AuraFit"}
        </p>
      </footer>
    </div>
  );
}

/* ─────────── Before/After showcase (rotates real examples) ─────────── */
function BeforeAfterShowcase() {
  const [idx, setIdx] = useState(0);
  const pair = BA_PAIRS[idx];
  return (
    <div>
      <BeforeAfter before={pair.before} after={pair.after} autoAnimate />
      {BA_PAIRS.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {BA_PAIRS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setIdx(i)}
              aria-label={p.label}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-white/90" : "w-1.5 bg-white/25 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
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
  status,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  status: "ativo" | "pro";
}) {
  const isPro = status === "pro";
  return (
    <button
      onClick={onClick}
      className={`glass relative flex flex-col items-start gap-5 rounded-2xl p-4 text-left transition-all active:scale-[0.97] hover:border-white/[0.10] ${!isPro ? "border-[color:var(--brand)]/40" : ""}`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] ${isPro ? "text-white/50" : "text-white/90"}`}>
        {icon}
      </div>
      <span className={`text-[13px] font-medium ${isPro ? "text-white/60" : ""}`}>{label}</span>
      <span
        className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] ${
          isPro
            ? "border border-[color:var(--brand)]/40 text-[color:var(--brand-2)]"
            : "text-muted-foreground"
        }`}
      >
        {isPro ? "Pro" : "Ativo"}
      </span>
    </button>
  );
}

/* ─────────── Before / After slider ─────────── */
function BeforeAfter({ before, after, autoAnimate }: { before: string; after: string; autoAnimate?: boolean }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const userInteracted = useRef(false);

  useEffect(() => {
    if (!autoAnimate) return;
    // Subtle invitation: nudge divider a few pixels, then settle.
    const start = performance.now();
    const duration = 1800;
    let raf = 0;
    const tick = (now: number) => {
      if (userInteracted.current) return;
      const t = Math.min(1, (now - start) / duration);
      // Two gentle oscillations then rest at 50.
      const wobble = Math.sin(t * Math.PI * 2) * 6 * (1 - t);
      setPos(50 + wobble);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoAnimate, before, after]);

  function updateFromClientX(clientX: number) {
    const el = ref.current;
    if (!el) return;
    userInteracted.current = true;
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
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt="Antes"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ width: `${100 * (100 / Math.max(pos, 0.0001))}%`, maxWidth: "none" }}
          draggable={false}
        />
      </div>

      <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white/90 backdrop-blur-md">
        Antes
      </span>
      <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white/90 backdrop-blur-md">
        Depois
      </span>

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
  garmentBuyUrl: string;
  uiCategory: UiCategory;
  errorMessage: string | null;
  setModelImage: (v: string | null) => void;
  setGarmentImage: (v: string | null) => void;
  setGarmentImageUrl: (v: string) => void;
  setGarmentBuyUrl: (v: string) => void;
  setUiCategory: (c: UiCategory) => void;
  onSubmit: () => void;
  onPro: () => void;
}) {
  const [linkModal, setLinkModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);

  const categories: Array<{
    id: UiCategory;
    label: string;
    hint: string;
    pro?: boolean;
    icon: React.ElementType;
  }> = [
    { id: "superior", label: "Superior", hint: "Camisas, camisetas, jaquetas e moletons.", icon: Shirt },
    { id: "inferior", label: "Inferior", hint: "Calças, shorts e saias.", icon: Shirt },
    { id: "calcados", label: "Calçados", hint: "Tênis, botas e sapatos.", pro: true, icon: Footprints },
    { id: "acessorios", label: "Acessórios", hint: "Óculos, bolsas e relógios.", pro: true, icon: Watch },
  ];

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 pt-14 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Experimentar
        </p>
        <h1 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-0.03em]">
          Veja como fica<br />em você.
        </h1>
      </header>

      {/* Step 1 — Escolha uma roupa */}
      <StepBlock number="1" title="Escolha uma roupa" hint="Envie a foto da peça ou escolha do catálogo da loja.">
        <ImageUpload
          value={props.garmentImage}
          onChange={(v) => { props.setGarmentImage(v); if (v) props.setGarmentImageUrl(""); }}
          primaryLabel="Enviar foto da roupa"
          secondaryLabel="Escolher do catálogo"
          secondaryDisabled={!STORE.storeCatalog?.length}
        />
        {props.garmentImageUrl && !props.garmentImage && (
          <div className="glass mt-3 flex items-center gap-3 rounded-2xl px-4 py-3">
            <Link2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="flex-1 truncate text-xs text-foreground/80">{props.garmentImageUrl}</span>
            <button
              onClick={() => props.setGarmentImageUrl("")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remover"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            onClick={() => setQrModal(true)}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <QrCode className="h-3.5 w-3.5" strokeWidth={1.5} />
            Escanear QR da loja
          </button>
          <button
            onClick={() => setLinkModal(true)}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Link2 className="h-3 w-3" strokeWidth={1.5} />
            Adicionar por link (opcional)
          </button>
        </div>
      </StepBlock>

      {/* Step 2 — Use sua foto */}
      <StepBlock number="2" title="Use sua foto" hint="Use uma foto de corpo inteiro, com boa iluminação.">
        <ImageUpload
          value={props.modelImage}
          onChange={props.setModelImage}
          primaryLabel="Tirar foto"
          secondaryLabel="Escolher da galeria"
          captureCamera
        />
      </StepBlock>

      {/* Step 3 — Categoria */}
      <StepBlock number="3" title="Escolha a categoria" hint="Escolha o tipo para um resultado mais fiel.">
        <div className="grid grid-cols-2 gap-2.5">
          {categories.map((c) => {
            const active = props.uiCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (c.pro) return props.onPro();
                  props.setUiCategory(c.id);
                }}
                className={`relative flex flex-col items-start gap-2 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
                  active && !c.pro
                    ? "border-[color:var(--brand)] bg-white/[0.03]"
                    : "border-[color:var(--border)] bg-[color:var(--surface)]"
                } ${c.pro ? "opacity-70" : ""}`}
              >
                <span className={`text-sm font-medium ${c.pro ? "text-white/70" : "text-white"}`}>
                  {c.label}
                </span>
                <span className="text-[10px] leading-snug text-muted-foreground">{c.hint}</span>
                {c.pro && (
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-[color:var(--brand)]/40 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-[color:var(--brand-2)]">
                    <Lock className="h-2.5 w-2.5" strokeWidth={2} /> Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </StepBlock>

      {props.errorMessage && (
        <div className="rounded-2xl border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/[0.08] px-4 py-3 text-sm text-white/90">
          {props.errorMessage}
        </div>
      )}

      <button
        onClick={props.onSubmit}
        className="btn-brand mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium active:scale-[0.98] transition-transform"
      >
        Ver como fica
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </button>

      {qrModal && <QrModal onClose={() => setQrModal(false)} />}


      {linkModal && (
        <LinkModal
          initialImage={props.garmentImageUrl}
          initialBuy={props.garmentBuyUrl}
          onClose={() => setLinkModal(false)}
          onSave={(img, buy) => {
            props.setGarmentImageUrl(img);
            props.setGarmentBuyUrl(buy);
            if (img) props.setGarmentImage(null);
            setLinkModal(false);
          }}
        />
      )}
    </div>
  );
}

function StepBlock({
  number,
  title,
  hint,
  children,
}: {
  number: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-display text-sm font-medium text-gradient-violet">{number}</span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ImageUpload({
  value,
  onChange,
  primaryLabel,
  secondaryLabel,
  captureCamera,
  secondaryDisabled,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  primaryLabel: string;
  secondaryLabel: string;
  captureCamera?: boolean;
  secondaryDisabled?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [fileError, setFileError] = useState<string | null>(null);

  function onFile(f: File) {
    setFileError(null);
    if (!f.type.startsWith("image/")) {
      setFileError("Arquivo inválido. Envie uma imagem.");
      return;
    }
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (f.size > MAX_BYTES) {
      setFileError("Imagem muito grande (máx. 10 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(f);
  }

  if (value) {
    return (
      <div className="glass relative aspect-[4/5] w-full overflow-hidden rounded-3xl">
        <img src={value} alt="Foto enviada" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 backdrop-blur-md"
          aria-label="Remover"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={() => (captureCamera ? cameraRef.current?.click() : galleryRef.current?.click())}
        className="glass flex flex-col items-center justify-center gap-2 rounded-2xl px-4 py-6 transition-all active:scale-[0.98] hover:border-white/[0.10]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04]">
          {captureCamera ? (
            <Camera className="h-4 w-4 text-white/90" strokeWidth={1.5} />
          ) : (
            <Upload className="h-4 w-4 text-white/90" strokeWidth={1.5} />
          )}
        </div>
        <span className="text-[12.5px] font-medium">{primaryLabel}</span>
      </button>
      <button
        type="button"
        disabled={secondaryDisabled}
        onClick={() => galleryRef.current?.click()}
        className={`glass flex flex-col items-center justify-center gap-2 rounded-2xl px-4 py-6 transition-all active:scale-[0.98] hover:border-white/[0.10] ${secondaryDisabled ? "opacity-40 pointer-events-none" : ""}`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04]">
          <ImagePlus className="h-4 w-4 text-white/90" strokeWidth={1.5} />
        </div>
        <span className="text-center text-[12.5px] font-medium leading-tight">{secondaryLabel}</span>
      </button>

      {captureCamera && (
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      )}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      {fileError && (
        <p className="col-span-2 text-center text-[11.5px] text-red-400/90">{fileError}</p>
      )}
    </div>
  );
}

/* ─────────── Link modal ─────────── */
function LinkModal({
  initialImage,
  initialBuy,
  onClose,
  onSave,
}: {
  initialImage: string;
  initialBuy: string;
  onClose: () => void;
  onSave: (image: string, buy: string) => void;
}) {
  const [img, setImg] = useState(initialImage);
  const [buy, setBuy] = useState(initialBuy);
  return (
    <ModalShell onClose={onClose}>
      <h3 className="font-display text-lg font-semibold tracking-tight">Adicionar por link</h3>
      <p className="mt-1 text-xs text-muted-foreground">Cole a URL da imagem da peça e, se quiser, o link de compra.</p>

      <div className="mt-5 space-y-3">
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
          <Link2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="url"
            inputMode="url"
            placeholder="URL da imagem da peça"
            value={img}
            onChange={(e) => setImg(e.target.value)}
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="url"
            inputMode="url"
            placeholder="Link de compra (opcional)"
            value={buy}
            onChange={(e) => setBuy(e.target.value)}
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <button
          onClick={onClose}
          className="glass rounded-full px-4 py-3 text-sm font-medium active:scale-[0.98]"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(img.trim(), buy.trim())}
          className="btn-brand rounded-full px-4 py-3 text-sm font-medium active:scale-[0.98]"
        >
          Salvar link
        </button>
      </div>
    </ModalShell>
  );
}

/* ─────────── QR modal (layout only) ─────────── */
function QrModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
        <QrCode className="h-5 w-5 text-white/85" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">Escanear QR da loja</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Aponte a câmera para o QR de uma peça na loja. Ela abre aqui automaticamente — depois é só enviar sua foto.
      </p>
      <div className="glass mt-5 flex aspect-square w-full items-center justify-center rounded-3xl">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]">
          <QrCode className="h-10 w-10 text-white/40" strokeWidth={1.25} />
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Em breve na sua loja parceira.
      </p>
      <button
        onClick={onClose}
        className="btn-brand mt-5 w-full rounded-full px-4 py-3 text-sm font-medium active:scale-[0.98]"
      >
        Entendi
      </button>
    </ModalShell>
  );
}


/* ─────────── Pro modal ─────────── */
function ProModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
        <Lock className="h-4 w-4 text-[color:var(--brand-2)]" strokeWidth={2} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">Disponível no AuraFit Pro.</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        O plano Pro permitirá experimentar calçados, acessórios e outras peças avançadas.
      </p>
      <button
        onClick={onClose}
        className="btn-brand mt-6 w-full rounded-full px-4 py-3 text-sm font-medium active:scale-[0.98]"
      >
        Entendi
      </button>
    </ModalShell>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 pt-16 backdrop-blur-md sm:items-center fade-in" onClick={onClose}>
      <div
        className="glass relative w-full max-w-[400px] rounded-[28px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
        {children}
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
        <h2 className="font-display text-[22px] font-semibold tracking-tight">Experimentando</h2>
        <p className="mt-2 text-sm text-muted-foreground">Alguns segundos.</p>
      </div>
    </div>
  );
}

/* ─────────── Result ─────────── */
function Result({
  image,
  original,
  buyUrl,
  onRetry,
}: {
  image: string;
  original: string | null;
  buyUrl?: string;
  onRetry: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Veja como ficou", url: image });
      } else {
        await navigator.clipboard.writeText(image);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {}
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 pt-14 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Resultado</p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight">Veja em você.</h1>
      </header>

      {original ? (
        <BeforeAfter before={original} after={image} />
      ) : (
        <div className="glass overflow-hidden rounded-[28px]">
          <img src={image} alt="Experimentação" className="h-auto w-full" />
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        Resultado salvo no seu histórico.
      </p>

      {/* Buy - primary */}
      {buyUrl ? (
        <a
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-4 text-sm font-medium active:scale-[0.98]"
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.5} /> Comprar peça
        </a>
      ) : (
        <button
          disabled
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4 text-sm font-medium text-white/40"
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.5} /> Link de compra não disponível
        </button>
      )}

      {/* Secondaries */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1600); }}
          className="glass inline-flex items-center justify-center gap-2 rounded-full px-4 py-3.5 text-sm font-medium active:scale-[0.98]"
        >
          {saved ? (
            <><Check className="h-4 w-4 text-[color:var(--success)]" strokeWidth={2} /> Salvo</>
          ) : (
            <><Bookmark className="h-4 w-4" strokeWidth={1.5} /> Salvar</>
          )}
        </button>
        <button
          onClick={handleShare}
          className="glass inline-flex items-center justify-center gap-2 rounded-full px-4 py-3.5 text-sm font-medium active:scale-[0.98]"
        >
          {copied ? (
            <><Check className="h-4 w-4 text-[color:var(--success)]" strokeWidth={2} /> Copiado</>
          ) : (
            <><Share2 className="h-4 w-4" strokeWidth={1.5} /> Compartilhar</>
          )}
        </button>
      </div>

      <button
        onClick={onRetry}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-transparent px-4 py-3.5 text-sm font-medium text-foreground/90 active:scale-[0.98] hover:bg-white/[0.03]"
      >
        Experimentar outra roupa
      </button>
    </div>
  );
}

/* ─────────── Wardrobe ─────────── */
function Wardrobe({
  looks,
  onDelete,
  onPro,
}: {
  looks: SavedLook[];
  onDelete: (id: string) => void;
  onPro: () => void;
}) {
  const [tab, setTab] = useState<"all" | "superior" | "inferior" | "pro">("all");

  const filtered =
    tab === "all"
      ? looks
      : tab === "pro"
        ? looks.filter((l) => PRO_CATS.includes(l.category))
        : looks.filter((l) => l.category === tab);

  const tabs: Array<{ id: typeof tab; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "superior", label: "Superiores" },
    { id: "inferior", label: "Inferiores" },
    { id: "pro", label: "Pro" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pt-14 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Salvos</p>
        <h1 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-0.03em]">Looks salvos</h1>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => (t.id === "pro" ? onPro() : setTab(t.id))}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all ${
              tab === t.id
                ? "border-[color:var(--brand)] bg-white/[0.03] text-white"
                : "border-[color:var(--border)] bg-[color:var(--surface)] text-foreground/60 hover:text-foreground"
            }`}
          >
            {t.label}
            {t.id === "pro" && (
              <Lock className="ml-1 -mt-0.5 inline h-2.5 w-2.5" strokeWidth={2} />
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass mt-4 flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <ImageIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">Você ainda não salvou nenhum look.</p>
          <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
            Experimente uma peça e salve para comparar depois.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((l) => (
            <div key={l.id} className="glass group relative overflow-hidden rounded-[20px] transition-all hover:border-white/[0.10]">
              <div className="aspect-[3/4] w-full">
                <img src={l.url} alt="Look salvo" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
              </div>
              <div className="flex items-center justify-between px-3 py-3">
                <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{l.category}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(l.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              </div>
              <button
                onClick={() => onDelete(l.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/60 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
                aria-label="Remover"
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
  const items: Array<{ label: string; icon: React.ElementType }> = [
    { label: "Meus looks", icon: Bookmark },
    { label: "Minhas fotos", icon: Images },
    { label: "Ajuda", icon: HelpCircle },
    { label: "Privacidade", icon: Shield },
    { label: "Sair", icon: LogOut },
  ];

  return (
    <div className="flex flex-1 flex-col gap-7 px-6 pt-14 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Conta</p>
        <h1 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-0.03em]">Perfil</h1>
      </header>

      <div className="glass flex items-center gap-4 rounded-3xl p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
          <User className="h-5 w-5 text-white/85" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium">Você</p>
          <p className="mt-1 text-xs text-muted-foreground">{lookCount} looks salvos</p>
        </div>
      </div>

      <Link
        to="/studio"
        className="glass group flex items-center justify-between rounded-3xl p-5 transition-all hover:border-white/[0.10]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/15 ring-1 ring-brand/30">
            <Store className="h-4 w-4 text-brand" strokeWidth={1.7} />
          </div>
          <div>
            <p className="text-sm font-medium">Modo Studio</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Painel para lojistas</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
      </Link>

      <div className="glass divide-y divide-[color:var(--border)] rounded-3xl overflow-hidden">

        {items.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex w-full items-center justify-between px-5 py-4 text-sm text-foreground/90 hover:bg-white/[0.02] transition-colors"
          >
            <span className="inline-flex items-center gap-3">
              <Icon className="h-4 w-4 text-white/70" strokeWidth={1.5} />
              {label}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        ))}
      </div>

      <p className="text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Powered by AuraFit
      </p>
    </div>
  );
}

/* ─────────── Bottom nav ─────────── */
function BottomNav({ current, onGo }: { current: Screen; onGo: (s: Screen) => void }) {
  const items: Array<{ screen: Screen; label: string; icon: React.ElementType }> = [
    { screen: "home", label: "Início", icon: HomeIcon },
    { screen: "tryon", label: "Experimentar", icon: Plus },
    { screen: "wardrobe", label: "Salvos", icon: Bookmark },
    { screen: "profile", label: "Perfil", icon: User },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[440px] justify-center px-5 pb-4 pt-2"
      style={{ paddingBottom: "max(0.9rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass flex w-full items-center justify-around rounded-full px-1.5 py-1.5">
        {items.map((it) => {
          const active =
            current === it.screen ||
            (it.screen === "tryon" && (current === "loading" || current === "result"));
          const Icon = it.icon;
          return (
            <button
              key={it.screen}
              onClick={() => onGo(it.screen)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-medium transition-all ${
                active ? "text-white" : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2 : 1.5} />
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
