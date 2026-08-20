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
import { generateTryOnLook, recoverTryOnLook } from "@/lib/tryon.functions";

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
  const recoverFn = useServerFn(recoverTryOnLook);
  const inFlight = useRef(false);
  const pendingRequestId = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedLooks(JSON.parse(raw));
    } catch {
      // O navegador pode bloquear armazenamento local em modo privado.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLooks));
    } catch {
      // A experiência continua normalmente quando o armazenamento está indisponível.
    }
  }, [savedLooks]);

  async function handleGenerate() {
    if (inFlight.current) return;
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

    inFlight.current = true;
    setCurrentScreen("loading");

    // If a previous attempt left a pending request_id, try to recover first
    // instead of spending a fresh generation.
    if (pendingRequestId.current) {
      try {
        const res = await recoverFn({ data: { requestId: pendingRequestId.current } });
        pendingRequestId.current = null;
        setGeneratedImage(res.imageUrl);
        const item: SavedLook = {
          id: crypto.randomUUID(),
          url: res.imageUrl,
          category: uiCategory,
          createdAt: Date.now(),
          buyUrl: garmentBuyUrl.trim() || undefined,
        };
        setSavedLooks((s) => [item, ...s]);
        setCurrentScreen("result");
        inFlight.current = false;
        return;
      } catch {
        // fall through to a fresh attempt
        pendingRequestId.current = null;
      }
    }

    try {
      const res = await generateFn({
        data: { model_image: model, garment_image: garment, category: apiCategory },
      });
      setGeneratedImage(res.imageUrl);
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
      const rid = (e as { requestId?: string })?.requestId ?? null;
      if (rid) {
        pendingRequestId.current = rid;
        setErrorMessage(
          "Seu resultado ainda está sendo finalizado. Toque em Gerar novamente para recuperar sem cobrar.",
        );
      } else {
        const msg = e instanceof Error ? e.message : "Não foi possível processar. Tente novamente.";
        setErrorMessage(msg === "__PENDING__" ? "Seu resultado ainda está sendo finalizado." : msg);
      }
      setCurrentScreen("tryon");
    } finally {
      inFlight.current = false;
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
      <div className="relative z-[2] mx-auto flex min-h-screen w-full flex-col">
        {currentScreen === "home" && (
          <Home onStart={() => openTryOn("superior")} onCategory={openTryOn} />
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
  const [activeChapter, setActiveChapter] = useState(0);
  const chapters = [
    { number: "01", title: "Escolha a peça", note: "Foto, catálogo ou link da loja" },
    { number: "02", title: "Entre em cena", note: "Uma foto sua, com luz natural" },
    { number: "03", title: "Compare o caimento", note: "Antes e depois no mesmo quadro" },
  ];

  return (
    <div className="min-h-dvh pb-32 fade-in">
      <header className="atelier-topbar">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="atelier-wordmark"
          aria-label="AuraFit, voltar ao topo"
        >
          <span className="atelier-wordmark__mark">AF</span>
          <span>AuraFit</span>
        </button>
        <p className="hidden text-[10px] uppercase tracking-[0.26em] text-muted-foreground sm:block">
          Provador digital · edição 01
        </p>
        <Link to="/studio" className="atelier-text-link">
          Studio <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main>
        <section className="editorial-hero">
          <div className="editorial-hero__copy auth-reveal">
            <p className="editorial-kicker">Vista a ideia antes da compra</p>
            <h1 className="editorial-hero__title">
              Seu corpo.
              <br />
              <em>Sua escolha.</em>
              <br />
              Antes do clique.
            </h1>
            <p className="editorial-hero__body">
              Um provador que transforma dúvida em decisão. Escolha a peça, entre em cena e compare
              o caimento.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button onClick={onStart} className="atelier-button">
                Começar prova <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })
                }
                className="atelier-text-link"
              >
                Ver o processo <span aria-hidden="true">↓</span>
              </button>
            </div>
            <div className="editorial-hero__index" aria-label="Resumo da experiência">
              <span>01 peça</span>
              <span>01 foto</span>
              <span>01 decisão melhor</span>
            </div>
          </div>
          <AtelierDeck active={activeChapter} onChange={setActiveChapter} />
        </section>

        <div className="atelier-tape" aria-hidden="true">
          <span>PROVE</span>
          <span>COMPARE</span>
          <span>DECIDA</span>
          <span>SEM ADIVINHAR</span>
        </div>

        <section id="como-funciona" className="atelier-section">
          <div className="atelier-section__heading">
            <SectionLabel>O processo</SectionLabel>
            <h2 className="font-display text-[clamp(2.8rem,7vw,6rem)] leading-[0.9] tracking-[-0.045em]">
              Três gestos.
              <br />
              Um look possível.
            </h2>
            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
              Toque em cada etapa para acompanhar como a peça atravessa o provador.
            </p>
          </div>
          <ol className="process-ledger">
            {chapters.map((chapter, index) => (
              <li key={chapter.number}>
                <button
                  className="process-ledger__item"
                  data-active={activeChapter === index}
                  onClick={() => setActiveChapter(index)}
                  aria-pressed={activeChapter === index}
                >
                  <span className="process-ledger__number">{chapter.number}</span>
                  <span>
                    <strong>{chapter.title}</strong>
                    <small>{chapter.note}</small>
                  </span>
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="atelier-section atelier-section--categories">
          <div className="atelier-section__heading">
            <SectionLabel>Acervo disponível</SectionLabel>
            <h2 className="font-display text-5xl leading-none tracking-[-0.04em] sm:text-6xl">
              Escolha por onde começar.
            </h2>
          </div>
          <div className="category-rail">
            <CategoryCard
              icon={<Shirt className="h-6 w-6" strokeWidth={1.35} />}
              label="Parte de cima"
              status="ativo"
              onClick={() => onCategory("superior")}
            />
            <CategoryCard
              icon={<Shirt className="h-6 w-6 rotate-180" strokeWidth={1.35} />}
              label="Parte de baixo"
              status="ativo"
              onClick={() => onCategory("inferior")}
            />
            <CategoryCard
              icon={<Footprints className="h-6 w-6" strokeWidth={1.35} />}
              label="Calçados"
              status="pro"
              onClick={() => onCategory("calcados")}
            />
            <CategoryCard
              icon={<Watch className="h-6 w-6" strokeWidth={1.35} />}
              label="Acessórios"
              status="pro"
              onClick={() => onCategory("acessorios")}
            />
          </div>
        </section>
      </main>

      <footer className="atelier-footer">
        <span>{STORE.storeName || "AuraFit"}</span>
        <span>Feito para escolher melhor.</span>
        <span>2026</span>
      </footer>
    </div>
  );
}

function AtelierDeck({ active, onChange }: { active: number; onChange: (index: number) => void }) {
  const cards = [
    { id: "garment", label: "Peça escolhida", meta: "imagem · textura · corte" },
    { id: "portrait", label: "Sua presença", meta: "pose · proporção · luz" },
    { id: "result", label: "Prova final", meta: "compare · salve · compre" },
  ];
  return (
    <div
      className="atelier-deck auth-reveal"
      data-active={active}
      style={{ animationDelay: "90ms" }}
    >
      <div className="atelier-deck__canvas" aria-live="polite">
        <div className="atelier-deck__measure" aria-hidden="true">
          <span>42</span>
          <span>68</span>
          <span>96</span>
        </div>
        <svg
          className="atelier-deck__figure"
          viewBox="0 0 420 560"
          role="img"
          aria-label={cards[active].label}
        >
          <path
            className="figure-line"
            d="M208 86c39 0 55 30 55 63 0 28-18 56-55 56s-55-28-55-56c0-33 16-63 55-63Z"
          />
          <path
            className="figure-line"
            d="M143 222c-42 32-54 87-50 143m180-143c42 32 54 87 50 143M143 222c18-14 41-22 65-22s47 8 65 22l-10 210H153l-10-210Z"
          />
          <path
            className="figure-garment"
            data-visible={active > 0}
            d="M142 226 98 278l39 38 21-23-5 136h110l-5-136 21 23 39-38-44-52-43 24h-46l-43-24Z"
          />
          <path
            className="figure-stitch"
            data-visible={active === 2}
            d="M184 250v179m47-179v179M137 316h142"
          />
        </svg>
        <div className="atelier-deck__ticket">
          <span>{cards[active].label}</span>
          <small>{cards[active].meta}</small>
        </div>
        <div className="fabric-swatch fabric-swatch--one" aria-hidden="true" />
        <div className="fabric-swatch fabric-swatch--two" aria-hidden="true" />
      </div>
      <div className="atelier-deck__controls" aria-label="Etapas da experiência">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => onChange(index)}
            aria-label={`Mostrar ${card.label}`}
            aria-pressed={active === index}
          >
            <span>0{index + 1}</span>
            <span>{card.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="editorial-kicker">{children}</p>;
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
    <button onClick={onClick} className="category-ledger">
      <span className="category-ledger__index">{isPro ? "EM BREVE" : "DISPONÍVEL"}</span>
      <span className="category-ledger__icon">{icon}</span>
      <span className="category-ledger__label">{label}</span>
      <span className="category-ledger__arrow" aria-hidden="true">
        ↗
      </span>
    </button>
  );
}

/* ─────────── Before / After slider ─────────── */
function BeforeAfter({
  before,
  after,
  autoAnimate,
}: {
  before: string;
  after: string;
  autoAnimate?: boolean;
}) {
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

  function updateFromKeyboard(event: React.KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowLeft: -5,
      ArrowDown: -5,
      ArrowRight: 5,
      ArrowUp: 5,
    };

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      userInteracted.current = true;
      setPos(event.key === "Home" ? 0 : 100);
      return;
    }

    const move = moves[event.key];
    if (move === undefined) return;

    event.preventDefault();
    userInteracted.current = true;
    setPos((current) => Math.max(0, Math.min(100, current + move)));
  }

  return (
    <div
      ref={ref}
      className="glass relative aspect-[3/4] w-full overflow-hidden select-none touch-none bg-ink"
      role="slider"
      tabIndex={0}
      aria-label="Comparar imagem antes e depois"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      aria-valuetext={`${Math.round(pos)}% da imagem original visível`}
      onKeyDown={updateFromKeyboard}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && updateFromClientX(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      {/* Both images fill the same box with object-contain so their scale
          matches exactly on every device — no head/feet cropping. */}
      <img
        src={after}
        alt="Depois"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
      <img
        src={before}
        alt="Antes"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />

      <span className="absolute left-3 top-3 border border-paper/30 bg-ink px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-paper">
        Antes
      </span>
      <span className="absolute right-3 top-3 border border-paper/30 bg-ink px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-paper">
        Depois
      </span>

      <div className="absolute inset-y-0 w-px bg-paper" style={{ left: `calc(${pos}% - 1px)` }} />
      <div
        className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-ink bg-tape text-ink"
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
    {
      id: "superior",
      label: "Superior",
      hint: "Camisas, camisetas, jaquetas e moletons.",
      icon: Shirt,
    },
    { id: "inferior", label: "Inferior", hint: "Calças, shorts e saias.", icon: Shirt },
    {
      id: "calcados",
      label: "Calçados",
      hint: "Tênis, botas e sapatos.",
      pro: true,
      icon: Footprints,
    },
    {
      id: "acessorios",
      label: "Acessórios",
      hint: "Óculos, bolsas e relógios.",
      pro: true,
      icon: Watch,
    },
  ];

  return (
    <div className="tryon-workspace fade-in">
      <header className="tryon-workspace__header">
        <p className="editorial-kicker">Prova · 01</p>
        <h1 className="mt-4 font-display text-[clamp(3.2rem,9vw,6.5rem)] font-medium leading-[0.84] tracking-[-0.05em]">
          Monte a<br />
          <em>prova.</em>
        </h1>
        <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
          Cada escolha aparece no quadro antes da geração. Revise a peça, sua foto e a categoria.
        </p>
      </header>

      {/* Step 1 — Escolha uma roupa */}
      <StepBlock
        number="1"
        title="Escolha uma roupa"
        hint="Envie a foto da peça ou escolha do catálogo da loja."
      >
        <ImageUpload
          value={props.garmentImage}
          onChange={(v) => {
            props.setGarmentImage(v);
            if (v) props.setGarmentImageUrl("");
          }}
          primaryLabel="Enviar foto da roupa"
          secondaryLabel="Escolher do catálogo"
          secondaryDisabled={!STORE.storeCatalog?.length}
        />
        {props.garmentImageUrl && !props.garmentImage && (
          <div className="glass mt-3 flex items-center gap-3 rounded-2xl px-4 py-3">
            <Link2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="flex-1 truncate text-xs text-foreground/80">
              {props.garmentImageUrl}
            </span>
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
      <StepBlock
        number="2"
        title="Use sua foto"
        hint="Use uma foto de corpo inteiro, com boa iluminação."
      >
        <ImageUpload
          value={props.modelImage}
          onChange={props.setModelImage}
          primaryLabel="Tirar foto"
          secondaryLabel="Escolher da galeria"
          captureCamera
        />
      </StepBlock>

      {/* Step 3 — Categoria */}
      <StepBlock
        number="3"
        title="Escolha a categoria"
        hint="Escolha o tipo para um resultado mais fiel."
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {categories.map((c) => {
            const active = props.uiCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (c.pro) return props.onPro();
                  props.setUiCategory(c.id);
                }}
                className={`category-choice ${
                  active && !c.pro ? "category-choice--active" : ""
                } ${c.pro ? "opacity-70" : ""}`}
              >
                <span
                  className={`text-sm font-medium ${c.pro ? "text-foreground/70" : "text-foreground"}`}
                >
                  {c.label}
                </span>
                <span className="text-[10px] leading-snug text-muted-foreground">{c.hint}</span>
                {c.pro && (
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 border border-brand/40 px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-brand">
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

      <button onClick={props.onSubmit} className="atelier-button mt-2 w-full justify-center py-4">
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
    <section className="step-ledger">
      <div className="step-ledger__heading">
        <span className="step-ledger__number">{number}</span>
        <div>
          <p className="text-base font-medium">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </section>
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
      <div className="glass relative aspect-[4/5] w-full overflow-hidden">
        <img src={value} alt="Foto enviada" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-paper/30 bg-ink text-paper"
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
        className="upload-tile"
      >
        <div className="upload-tile__icon">
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
        className={`upload-tile ${secondaryDisabled ? "opacity-40 pointer-events-none" : ""}`}
      >
        <div className="upload-tile__icon">
          <ImagePlus className="h-4 w-4 text-white/90" strokeWidth={1.5} />
        </div>
        <span className="text-center text-[12.5px] font-medium leading-tight">
          {secondaryLabel}
        </span>
      </button>

      {captureCamera && (
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      )}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
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
    <ModalShell label="Adicionar peça por link" onClose={onClose}>
      <h3 className="font-display text-lg font-semibold tracking-tight">Adicionar por link</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Cole a URL da imagem da peça e, se quiser, o link de compra.
      </p>

      <div className="mt-5 space-y-3">
        <div className="archive-field">
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
        <div className="archive-field">
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
          className="atelier-button atelier-button--quiet justify-center px-4 py-3 text-sm"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(img.trim(), buy.trim())}
          className="atelier-button justify-center px-4 py-3 text-sm"
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
    <ModalShell label="Escanear QR da loja" onClose={onClose}>
      <div className="archive-stamp">
        <QrCode className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
        Escanear QR da loja
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Aponte a câmera para o QR de uma peça na loja. Ela abre aqui automaticamente — depois é só
        enviar sua foto.
      </p>
      <div className="paper-panel mt-5 flex aspect-square w-full items-center justify-center">
        <div className="flex h-24 w-24 items-center justify-center border border-ink/30 bg-paper-deep/50">
          <QrCode className="h-10 w-10 text-ink/55" strokeWidth={1.25} />
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Em breve na sua loja parceira.
      </p>
      <button
        onClick={onClose}
        className="atelier-button mt-5 w-full justify-center px-4 py-3 text-sm"
      >
        Entendi
      </button>
    </ModalShell>
  );
}

/* ─────────── Pro modal ─────────── */
function ProModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell label="Recursos AuraFit Pro" onClose={onClose}>
      <div className="archive-stamp">
        <Lock className="h-4 w-4 text-[color:var(--brand-2)]" strokeWidth={2} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
        Disponível no AuraFit Pro.
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        O plano Pro permitirá experimentar calçados, acessórios e outras peças avançadas.
      </p>
      <button
        onClick={onClose}
        className="atelier-button mt-6 w-full justify-center px-4 py-3 text-sm"
      >
        Entendi
      </button>
    </ModalShell>
  );
}

function useDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) =>
          !element.hasAttribute("hidden") &&
          element.getAttribute("aria-hidden") !== "true" &&
          element.getClientRects().length > 0 &&
          getComputedStyle(element).visibility !== "hidden",
      );

    const frame = requestAnimationFrame(() => (focusables()[0] ?? dialog).focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return dialogRef;
}

function ModalShell({
  children,
  label,
  onClose,
}: {
  children: React.ReactNode;
  label: string;
  onClose: () => void;
}) {
  const dialogRef = useDialogFocus(onClose);

  return (
    <div className="modal-curtain fade-in" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-border-strong bg-surface text-muted-foreground transition-colors hover:bg-terracotta hover:text-ink"
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
    <div className="loading-loom fade-in" role="status" aria-live="polite">
      <div className="loading-loom__frame" aria-hidden="true">
        <span className="loading-loom__thread loading-loom__thread--one" />
        <span className="loading-loom__thread loading-loom__thread--two" />
        <span className="loading-loom__thread loading-loom__thread--three" />
        <Sparkles className="loading-loom__spark" strokeWidth={1.35} />
        <span className="loading-loom__label">PROCESSANDO · CAIMENTO · LUZ</span>
      </div>
      <div className="text-center">
        <p className="editorial-kicker mx-auto">Prova em andamento</p>
        <h2 className="mt-4 font-display text-4xl font-medium tracking-tight">Ajustando o look.</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Compondo peça, proporção e luz. Alguns segundos.
        </p>
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
    } catch {
      // O cancelamento do compartilhamento não precisa interromper a experiência.
    }
  }

  return (
    <div className="experience-screen experience-screen--result fade-in">
      <header className="experience-heading">
        <p className="editorial-kicker">Resultado · prova concluída</p>
        <h1>
          Veja em <em>você.</em>
        </h1>
        <p>Arraste a régua sobre a imagem e compare o caimento antes de decidir.</p>
      </header>

      <div className="result-media">
        {original ? (
          <BeforeAfter before={original} after={image} />
        ) : (
          <div className="editorial-card overflow-hidden">
            <img src={image} alt="Experimentação" className="h-auto w-full" />
          </div>
        )}
      </div>

      <div className="result-actions">
        <p className="archive-index">Resultado salvo no seu histórico.</p>
        {buyUrl ? (
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="atelier-button w-full justify-center px-4 py-4 text-sm"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.5} /> Comprar peça
          </a>
        ) : (
          <button
            disabled
            className="atelier-button atelier-button--quiet w-full justify-center px-4 py-4 text-sm opacity-45"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.5} /> Link de compra não disponível
          </button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 1600);
            }}
            className="atelier-button atelier-button--quiet justify-center px-3 py-3.5 text-sm"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4 text-success" strokeWidth={2} /> Salvo
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" strokeWidth={1.5} /> Salvar
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="atelier-button atelier-button--quiet justify-center px-3 py-3.5 text-sm"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-success" strokeWidth={2} /> Copiado
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" strokeWidth={1.5} /> Compartilhar
              </>
            )}
          </button>
        </div>
        <button onClick={onRetry} className="atelier-text-link justify-center py-3">
          Experimentar outra roupa <ArrowRight className="h-4 w-4" />
        </button>
      </div>
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
    <div className="experience-screen fade-in">
      <header className="experience-heading">
        <p className="editorial-kicker">Arquivo pessoal</p>
        <h1>
          Looks <em>salvos.</em>
        </h1>
        <p>Revise suas provas como uma mesa de contato: compare, filtre e retome suas escolhas.</p>
      </header>

      <div className="filter-ledger">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => (t.id === "pro" ? onPro() : setTab(t.id))}
            className={`filter-ledger__item ${tab === t.id ? "filter-ledger__item--active" : ""}`}
          >
            {t.label}
            {t.id === "pro" && <Lock className="ml-1 -mt-0.5 inline h-2.5 w-2.5" strokeWidth={2} />}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="editorial-empty">
          <ImageIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">Você ainda não salvou nenhum look.</p>
          <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
            Experimente uma peça e salve para comparar depois.
          </p>
        </div>
      ) : (
        <div className="look-contact-sheet">
          {filtered.map((l) => (
            <article key={l.id} className="look-contact-sheet__item group">
              <div className="aspect-[3/4] w-full">
                <img
                  src={l.url}
                  alt="Look salvo"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-3">
                <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                  {l.category}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(l.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
              <button
                onClick={() => onDelete(l.id)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center border border-paper/30 bg-ink text-paper opacity-100 transition-colors hover:bg-terracotta hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                aria-label="Remover"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </article>
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
    <div className="experience-screen experience-screen--profile fade-in">
      <header className="experience-heading">
        <p className="editorial-kicker">Conta · arquivo</p>
        <h1>
          Seu <em>perfil.</em>
        </h1>
        <p>Preferências, histórico e acesso ao espaço de lojistas em uma só ficha.</p>
      </header>

      <div className="profile-ticket">
        <div className="profile-ticket__avatar">
          <User className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium">Você</p>
          <p className="mt-1 text-xs text-muted-foreground">{lookCount} looks salvos</p>
        </div>
      </div>

      <Link to="/studio" className="profile-ledger group">
        <div className="flex items-center gap-4">
          <div className="profile-ledger__icon">
            <Store className="h-4 w-4 text-brand" strokeWidth={1.7} />
          </div>
          <div>
            <p className="text-sm font-medium">Modo Studio</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Painel para lojistas</p>
          </div>
        </div>
        <ChevronRight
          className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          strokeWidth={1.5}
        />
      </Link>

      <div className="profile-menu">
        {items.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex w-full items-center justify-between px-5 py-4 text-sm text-foreground/90 transition-colors hover:bg-paper hover:text-ink"
          >
            <span className="inline-flex items-center gap-3">
              <Icon className="h-4 w-4" strokeWidth={1.5} />
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
      className="atelier-nav"
      style={{ paddingBottom: "max(0.9rem, env(safe-area-inset-bottom))" }}
    >
      <div className="atelier-nav__rail">
        {items.map((it) => {
          const active =
            current === it.screen ||
            (it.screen === "tryon" && (current === "loading" || current === "result"));
          const Icon = it.icon;
          return (
            <button
              key={it.screen}
              onClick={() => onGo(it.screen)}
              className={`atelier-nav__item ${active ? "atelier-nav__item--active" : ""}`}
            >
              <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2 : 1.5} />
              <span className="tracking-wide">{it.label}</span>
              {active && <span className="atelier-nav__indicator" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
