import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Home as HomeIcon,
  Sparkles,
  Shirt,
  User,
  Upload,
  Link2,
  ArrowRight,
  Bookmark,
  RefreshCw,
  GitCompareArrows,
  Check,
  X,
  Image as ImageIcon,
  ChevronRight,
} from "lucide-react";
import { generateTryOnLook } from "@/lib/tryon.functions";

export const Route = createFileRoute("/")({
  component: AuraFitApp,
});

type Screen = "splash" | "onboarding" | "home" | "tryon" | "loading" | "result" | "wardrobe" | "profile";
type Category = "tops" | "bottoms";
type SavedLook = { id: string; url: string; category: Category; createdAt: number };

const STORAGE_KEY = "aurafit_looks";
const ONBOARD_KEY = "aurafit_onboarded";

function AuraFitApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash");
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const [modelImage, setModelImage] = useState<string | null>(null); // base64/data URL or remote URL
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [modelImageUrl, setModelImageUrl] = useState("");
  const [garmentImageUrl, setGarmentImageUrl] = useState("");
  const [category, setCategory] = useState<Category>("tops");

  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateFn = useServerFn(generateTryOnLook);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedLooks(JSON.parse(raw));
      if (localStorage.getItem(ONBOARD_KEY) === "1") setOnboardingCompleted(true);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLooks)); } catch {}
  }, [savedLooks]);

  async function handleGenerate() {
    setErrorMessage(null);
    const model = modelImage;
    const garment = garmentImage || garmentImageUrl.trim();
    if (!model) return setErrorMessage("Envie uma foto do modelo.");
    if (!garment) return setErrorMessage("Envie a peça ou cole a URL.");

    setIsLoading(true);
    setCurrentScreen("loading");
    try {
      const res = await generateFn({
        data: { model_image: model, garment_image: garment, category },
      });
      setGeneratedImage(res.imageUrl);
      setCurrentScreen("result");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível gerar o look.";
      setErrorMessage(msg);
      setCurrentScreen("tryon");
    } finally {
      setIsLoading(false);
    }
  }

  function saveCurrent() {
    if (!generatedImage) return;
    const item: SavedLook = { id: crypto.randomUUID(), url: generatedImage, category, createdAt: Date.now() };
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
    <div className="min-h-screen w-full text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col">
        {currentScreen === "splash" && (
          <Splash
            onStart={() => setCurrentScreen(onboardingCompleted ? "home" : "onboarding")}
          />
        )}
        {currentScreen === "onboarding" && (
          <Onboarding
            onDone={() => {
              setOnboardingCompleted(true);
              try { localStorage.setItem(ONBOARD_KEY, "1"); } catch {}
              setCurrentScreen("home");
            }}
          />
        )}
        {currentScreen === "home" && (
          <Home
            savedLooks={savedLooks}
            onNewLook={() => setCurrentScreen("tryon")}
            onCategory={(c) => { setCategory(c); setCurrentScreen("tryon"); }}
            onOpenWardrobe={() => setCurrentScreen("wardrobe")}
          />
        )}
        {currentScreen === "tryon" && (
          <TryOn
            modelImage={modelImage}
            garmentImage={garmentImage}
            modelImageUrl={modelImageUrl}
            garmentImageUrl={garmentImageUrl}
            category={category}
            errorMessage={errorMessage}
            setModelImage={setModelImage}
            setGarmentImage={setGarmentImage}
            setModelImageUrl={setModelImageUrl}
            setGarmentImageUrl={setGarmentImageUrl}
            setCategory={setCategory}
            onSubmit={handleGenerate}
          />
        )}
        {currentScreen === "loading" && <LoadingScreen />}
        {currentScreen === "result" && generatedImage && (
          <Result
            image={generatedImage}
            category={category}
            onSave={saveCurrent}
            onRetry={resetTryOn}
            onCompare={() => setCurrentScreen("wardrobe")}
          />
        )}
        {currentScreen === "wardrobe" && (
          <Wardrobe looks={savedLooks} onDelete={(id) => setSavedLooks((s) => s.filter((l) => l.id !== id))} />
        )}
        {currentScreen === "profile" && <Profile lookCount={savedLooks.length} />}

        {/* Bottom nav: only after onboarding, hide on splash/onboarding/loading */}
        {!["splash", "onboarding", "loading"].includes(currentScreen) && (
          <BottomNav current={currentScreen} onGo={(s) => setCurrentScreen(s)} />
        )}
      </div>
    </div>
  );
}

/* ─────────── Splash ─────────── */
function Splash({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-between px-6 py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{ background: "radial-gradient(500px 300px at 50% 20%, color-mix(in oklab, var(--accent-neon) 22%, transparent), transparent 70%)" }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40vh]"
        style={{ background: "radial-gradient(400px 250px at 50% 80%, color-mix(in oklab, var(--accent-violet) 30%, transparent), transparent 70%)" }}
      />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/60 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-neon shadow-glow-neon" />
          Beta · Powered by FASHN AI
        </div>
        <h1 className="font-display text-6xl font-semibold leading-[0.95] tracking-tight">
          <span className="text-gradient-brand">AuraFit</span>
          <span className="ml-2 text-accent-neon">AI</span>
        </h1>
        <p className="mt-8 max-w-xs text-lg font-medium text-foreground">
          Veja o look antes de comprar.
        </p>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          Teste roupas em modelos reais com inteligência artificial.
        </p>
      </div>
      <button
        onClick={onStart}
        className="relative z-10 group inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-neon px-6 py-4 text-sm font-semibold tracking-wide text-background transition-all active:scale-[0.98] glow-neon"
      >
        Começar
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

/* ─────────── Onboarding ─────────── */
function Onboarding({ onDone }: { onDone: () => void }) {
  const steps = [
    { icon: Shirt, title: "Teste qualquer peça", text: "Use imagens de Zara, Shopee, SHEIN ou qualquer outro site." },
    { icon: User, title: "Visualize no corpo", text: "Envie sua foto ou escolha um modelo padrão." },
    { icon: Sparkles, title: "Monte looks melhores", text: "Compare peças, salve combinações e compre com mais confiança." },
  ];
  const [i, setI] = useState(0);

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {steps.map((_, idx) => (
            <span key={idx} className={`h-1 rounded-full transition-all ${idx === i ? "w-6 bg-accent-neon" : "w-2 bg-border-strong"}`} />
          ))}
        </div>
        <button onClick={onDone} className="text-xs uppercase tracking-widest text-muted-foreground">
          Pular
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="glass mb-8 flex h-20 w-20 items-center justify-center rounded-3xl glow-violet">
          {(() => { const Icon = steps[i].icon; return <Icon className="h-8 w-8 text-accent-neon" />; })()}
        </div>
        <h2 className="font-display text-3xl font-semibold leading-tight">{steps[i].title}</h2>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{steps[i].text}</p>
      </div>

      <button
        onClick={() => (i < steps.length - 1 ? setI(i + 1) : onDone())}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 text-sm font-semibold text-background active:scale-[0.98]"
      >
        {i < steps.length - 1 ? "Continuar" : "Entrar no AuraFit"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─────────── Home ─────────── */
function Home({
  savedLooks,
  onNewLook,
  onCategory,
  onOpenWardrobe,
}: {
  savedLooks: SavedLook[];
  onNewLook: () => void;
  onCategory: (c: Category) => void;
  onOpenWardrobe: () => void;
}) {
  const recent = savedLooks.slice(0, 6);
  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-12 pb-32">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Bem-vindo</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">
          Seu provador <span className="text-gradient-neon">inteligente</span>
        </h1>
      </header>

      {/* Hero action */}
      <button
        onClick={onNewLook}
        className="glass group relative overflow-hidden rounded-3xl p-6 text-left transition-transform active:scale-[0.99]"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-60 blur-3xl"
          style={{ background: "color-mix(in oklab, var(--accent-violet) 60%, transparent)" }} />
        <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full opacity-40 blur-3xl"
          style={{ background: "color-mix(in oklab, var(--accent-neon) 55%, transparent)" }} />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-strong bg-background/40 px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent-neon" /> IA · FASHN v1.6
          </div>
          <h2 className="font-display text-2xl font-semibold leading-tight">Gerar novo look</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Envie um modelo, escolha a peça e deixe a IA fazer o styling.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent-neon">
            Começar sessão <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </button>

      {/* Mini cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <MiniCard icon={<Shirt className="h-4 w-4" />} label="Tops" onClick={() => onCategory("tops")} />
        <MiniCard icon={<Shirt className="h-4 w-4 rotate-180" />} label="Bottoms" onClick={() => onCategory("bottoms")} />
        <MiniCard icon={<Bookmark className="h-4 w-4" />} label="Salvos" onClick={onOpenWardrobe} />
      </div>

      {/* Recent */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Últimos testes</h3>
          {recent.length > 0 && (
            <button onClick={onOpenWardrobe} className="inline-flex items-center gap-1 text-xs text-foreground/80">
              Ver todos <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState onAction={onNewLook} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recent.map((l) => <LookCard key={l.id} look={l} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniCard({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition-transform active:scale-95"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-elevated text-accent-neon">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated">
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">Nada por aqui ainda</p>
        <p className="mt-1 text-xs text-muted-foreground">Seus looks gerados vão aparecer aqui.</p>
      </div>
      <button onClick={onAction} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-neon px-4 py-2 text-xs font-semibold text-background">
        Criar primeiro look <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ─────────── Try-on ─────────── */
function TryOn(props: {
  modelImage: string | null;
  garmentImage: string | null;
  modelImageUrl: string;
  garmentImageUrl: string;
  category: Category;
  errorMessage: string | null;
  setModelImage: (v: string | null) => void;
  setGarmentImage: (v: string | null) => void;
  setModelImageUrl: (v: string) => void;
  setGarmentImageUrl: (v: string) => void;
  setCategory: (c: Category) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5 px-5 pt-12 pb-32">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Provador IA</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">Monte seu look</h1>
      </header>

      <ImageUpload
        label="Foto do modelo"
        hint="Envie sua foto ou de um modelo."
        value={props.modelImage}
        onChange={props.setModelImage}
      />

      <ImageUpload
        label="Foto da peça"
        hint="Use upload ou cole a URL da roupa abaixo."
        value={props.garmentImage}
        onChange={props.setGarmentImage}
      />

      <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2.5">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <input
          type="url"
          inputMode="url"
          placeholder="Cole a URL da imagem da peça"
          value={props.garmentImageUrl}
          onChange={(e) => props.setGarmentImageUrl(e.target.value)}
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Categoria</p>
        <div className="grid grid-cols-2 gap-2">
          {(["tops", "bottoms"] as const).map((c) => (
            <button
              key={c}
              onClick={() => props.setCategory(c)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.98] ${
                props.category === c
                  ? "border-accent-neon bg-accent-neon/10 text-accent-neon"
                  : "border-border bg-surface text-foreground/80"
              }`}
            >
              {c === "tops" ? "Top" : "Bottom"}
            </button>
          ))}
        </div>
      </div>

      {props.errorMessage && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {props.errorMessage}
        </div>
      )}

      <button
        onClick={props.onSubmit}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-neon px-6 py-4 text-sm font-semibold text-background active:scale-[0.98] glow-neon"
      >
        <Sparkles className="h-4 w-4" />
        Gerar Look IA
      </button>
      <p className="text-center text-xs text-muted-foreground">
        A IA aplica a peça ao corpo mantendo pose, proporção e estilo visual.
      </p>
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
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <div
        onClick={() => ref.current?.click()}
        className="glass group relative flex aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-3xl"
      >
        {value ? (
          <>
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated">
              <Upload className="h-5 w-5 text-accent-neon" />
            </div>
            <p className="text-sm font-medium">Toque para enviar</p>
            <p className="text-xs text-muted-foreground">JPG, PNG · até 10 MB</p>
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
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="relative">
        <div className="glass shimmer flex h-64 w-52 items-center justify-center overflow-hidden rounded-3xl">
          <div className="shimmer-overlay" />
          <Sparkles className="h-8 w-8 text-accent-neon pulse-glow" />
        </div>
        <div className="pointer-events-none absolute -inset-4 rounded-[2rem] glow-violet" />
      </div>
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold">Construindo seu look…</h2>
        <p className="mt-2 text-sm text-muted-foreground">Ajustando tecido, proporção e caimento.</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-accent-neon"
            style={{ animation: `pulse-glow 1.4s ${i * 0.2}s ease-in-out infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────── Result ─────────── */
function Result({
  image,
  category,
  onSave,
  onRetry,
  onCompare,
}: {
  image: string;
  category: Category;
  onSave: () => void;
  onRetry: () => void;
  onCompare: () => void;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pt-12 pb-32">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Resultado</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Seu look</h1>
        </div>
        <span className="rounded-full border border-border-strong bg-surface px-3 py-1 text-[11px] uppercase tracking-widest text-accent-neon">
          {category === "tops" ? "Top" : "Bottom"}
        </span>
      </header>

      <div className="glass overflow-hidden rounded-3xl">
        <img src={image} alt="Look gerado" className="h-auto w-full" />
      </div>

      <p className="text-xs text-muted-foreground">
        Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
      </p>

      <div className="mt-1 grid grid-cols-3 gap-2">
        <button
          onClick={() => { onSave(); setSaved(true); setTimeout(() => setSaved(false), 1600); }}
          className="glass col-span-3 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-semibold active:scale-[0.98]"
        >
          {saved ? <><Check className="h-4 w-4 text-accent-neon" /> Salvo</> : <><Bookmark className="h-4 w-4" /> Salvar look</>}
        </button>
        <button onClick={onRetry} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-accent-neon px-4 py-3.5 text-sm font-semibold text-background active:scale-[0.98] glow-neon">
          <RefreshCw className="h-4 w-4" /> Testar outra
        </button>
        <button onClick={onCompare} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-3.5 text-sm font-medium active:scale-[0.98]">
          <GitCompareArrows className="h-4 w-4" /> Comparar
        </button>
      </div>
    </div>
  );
}

/* ─────────── Wardrobe ─────────── */
function Wardrobe({ looks, onDelete }: { looks: SavedLook[]; onDelete: (id: string) => void }) {
  const [tab, setTab] = useState<"all" | "tops" | "bottoms" | "looks">("all");
  const filtered = tab === "all" || tab === "looks" ? looks : looks.filter((l) => l.category === tab);

  const tabs: Array<{ id: typeof tab; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "tops", label: "Tops" },
    { id: "bottoms", label: "Bottoms" },
    { id: "looks", label: "Looks" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5 px-5 pt-12 pb-32">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Guarda-roupa virtual</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">Sua coleção</h1>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all ${
              tab === t.id
                ? "border-accent-neon bg-accent-neon/10 text-accent-neon"
                : "border-border bg-surface text-foreground/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass mt-4 flex flex-col items-center gap-2 rounded-3xl px-6 py-14 text-center">
          <Shirt className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Nenhum look salvo ainda</p>
          <p className="text-xs text-muted-foreground">Gere seu primeiro look e salve para revisitar depois.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((l) => <LookCard key={l.id} look={l} onDelete={() => onDelete(l.id)} />)}
        </div>
      )}
    </div>
  );
}

function LookCard({ look, onDelete }: { look: SavedLook; onDelete?: () => void }) {
  return (
    <div className="glass group relative overflow-hidden rounded-2xl">
      <div className="aspect-[3/4] w-full">
        <img src={look.url} alt="Look salvo" className="h-full w-full object-cover" />
      </div>
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-[10px] uppercase tracking-widest text-accent-neon">{look.category}</span>
        <span className="text-[10px] text-muted-foreground">
          {new Date(look.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </span>
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/70 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─────────── Profile ─────────── */
function Profile({ lookCount }: { lookCount: number }) {
  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-12 pb-32">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Perfil</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">Sua conta</h1>
      </header>

      <div className="glass flex items-center gap-4 rounded-3xl p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated">
          <User className="h-6 w-6 text-accent-neon" />
        </div>
        <div>
          <p className="text-sm font-medium">Convidado</p>
          <p className="text-xs text-muted-foreground">{lookCount} looks salvos</p>
        </div>
      </div>

      <div className="glass divide-y divide-border rounded-3xl">
        {["Preferências de estilo", "Assinatura AuraFit+", "Central de ajuda", "Sobre o AuraFit AI"].map((item) => (
          <button key={item} className="flex w-full items-center justify-between px-5 py-4 text-sm text-foreground/90">
            {item}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] uppercase tracking-widest text-muted-foreground">v1.0 · Beta</p>
    </div>
  );
}

/* ─────────── Bottom nav ─────────── */
function BottomNav({ current, onGo }: { current: Screen; onGo: (s: Screen) => void }) {
  const items: Array<{ screen: Screen; label: string; icon: React.ElementType }> = [
    { screen: "home", label: "Home", icon: HomeIcon },
    { screen: "tryon", label: "Provador", icon: Sparkles },
    { screen: "wardrobe", label: "Guarda-Roupa", icon: Shirt },
    { screen: "profile", label: "Perfil", icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[440px] justify-center px-4 pb-4 pt-2"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass flex w-full items-center justify-around rounded-full px-2 py-2">
        {items.map((it) => {
          const active = current === it.screen || (it.screen === "tryon" && (current === "loading" || current === "result"));
          const Icon = it.icon;
          return (
            <button
              key={it.screen}
              onClick={() => onGo(it.screen)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 text-[10px] font-medium transition-all ${
                active ? "text-accent-neon" : "text-muted-foreground"
              }`}
            >
              {active && <span className="absolute inset-x-4 -top-0.5 h-0.5 rounded-full bg-accent-neon shadow-glow-neon" />}
              <Icon className="h-4 w-4" />
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
