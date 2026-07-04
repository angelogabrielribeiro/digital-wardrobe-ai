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
  Plus,
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

  const [modelImage, setModelImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [modelImageUrl, setModelImageUrl] = useState("");
  const [garmentImageUrl, setGarmentImageUrl] = useState("");
  const [category, setCategory] = useState<Category>("tops");

  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateFn = useServerFn(generateTryOnLook);

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
          <Splash onStart={() => setCurrentScreen(onboardingCompleted ? "home" : "onboarding")} />
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
    <div className="relative flex flex-1 flex-col items-center justify-between px-8 py-20 fade-in">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 400px at 50% 30%, rgba(141,103,255,0.10), transparent 65%)",
        }}
      />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-white/[0.02] px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          <span className="inline-block h-1 w-1 rounded-full bg-brand" />
          Beta
        </div>
        <h1 className="font-display text-[64px] font-semibold leading-[0.9] tracking-[-0.04em]">
          AuraFit
        </h1>
        <p className="mt-8 max-w-xs text-base font-light text-foreground/90">
          Create. Try. Wear.
        </p>
        <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-muted-foreground">
          O provador virtual para uma nova era da moda.
        </p>
      </div>
      <button
        onClick={onStart}
        className="btn-brand relative z-10 group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium tracking-wide transition-transform active:scale-[0.98] hover:scale-[1.01]"
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
    { icon: Shirt, title: "Teste qualquer peça", text: "Zara, SSENSE, Farfetch, COS. Qualquer imagem, qualquer loja." },
    { icon: User, title: "Visualize no corpo", text: "Sua foto, seu modelo. Proporção e caimento reais." },
    { icon: Sparkles, title: "Compre com convicção", text: "Compare, salve e finalize apenas o que combina com você." },
  ];
  const [i, setI] = useState(0);

  return (
    <div className="flex flex-1 flex-col px-6 py-12">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={`h-[3px] rounded-full transition-all duration-500 ${
                idx === i ? "w-8 bg-brand" : "w-4 bg-white/10"
              }`}
            />
          ))}
        </div>
        <button onClick={onDone} className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors">
          Pular
        </button>
      </div>

      <div key={i} className="flex flex-1 flex-col items-center justify-center text-center fade-up">
        <div className="glass mb-10 flex h-16 w-16 items-center justify-center rounded-2xl">
          {(() => { const Icon = steps[i].icon; return <Icon className="h-6 w-6 text-white/90" strokeWidth={1.5} />; })()}
        </div>
        <h2 className="font-display text-[32px] font-semibold leading-[1.05] tracking-tight max-w-[280px]">{steps[i].title}</h2>
        <p className="mt-5 max-w-[280px] text-sm leading-relaxed text-muted-foreground">{steps[i].text}</p>
      </div>

      <button
        onClick={() => (i < steps.length - 1 ? setI(i + 1) : onDone())}
        className="btn-brand inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium active:scale-[0.98] transition-transform"
      >
        {i < steps.length - 1 ? "Continuar" : "Entrar"}
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
    <div className="flex flex-1 flex-col gap-8 px-6 pt-16 pb-32 fade-in">
      <header className="fade-up">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">AuraFit</p>
        <h1 className="mt-3 font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.03em]">
          Visualize antes<br />de comprar.
        </h1>
      </header>

      {/* Hero card */}
      <button
        onClick={onNewLook}
        className="glass group relative overflow-hidden rounded-[28px] p-7 text-left transition-all active:scale-[0.99] hover:border-white/[0.10] fade-up"
        style={{ animationDelay: "60ms" }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(141,103,255,0.35), transparent 70%)" }}
        />
        <div className="relative flex min-h-[220px] flex-col justify-between">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-white/[0.02] px-2.5 py-1 text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-white/70" strokeWidth={1.5} /> IA · FASHN
            </div>
            <h2 className="font-display text-[28px] font-semibold leading-[1.05] tracking-tight">
              Gerar novo look
            </h2>
            <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
              Transforme qualquer peça em um editorial.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <span className="text-sm font-medium text-white/95">Começar</span>
            <span className="btn-brand flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </div>
        </div>
      </button>

      {/* Mini cards */}
      <div className="grid grid-cols-3 gap-3 fade-up" style={{ animationDelay: "120ms" }}>
        <MiniCard icon={<Shirt className="h-4 w-4" strokeWidth={1.5} />} label="Tops" onClick={() => onCategory("tops")} />
        <MiniCard icon={<Shirt className="h-4 w-4 rotate-180" strokeWidth={1.5} />} label="Bottoms" onClick={() => onCategory("bottoms")} />
        <MiniCard icon={<Bookmark className="h-4 w-4" strokeWidth={1.5} />} label="Salvos" onClick={onOpenWardrobe} />
      </div>

      {/* Recent */}
      <section className="fade-up" style={{ animationDelay: "180ms" }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Últimos looks
          </h3>
          {recent.length > 0 && (
            <button onClick={onOpenWardrobe} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
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
      className="glass flex flex-col items-start gap-4 rounded-2xl p-4 text-left transition-all active:scale-[0.97] hover:border-white/[0.10]"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-white/85">
        {icon}
      </div>
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  );
}

function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-4 rounded-3xl px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04]">
        <ImageIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-medium">Nada por aqui ainda</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Seus looks aparecem aqui.</p>
      </div>
      <button onClick={onAction} className="btn-brand mt-1 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium">
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
    <div className="flex flex-1 flex-col gap-6 px-6 pt-16 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Create</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight tracking-[-0.03em]">Monte seu look</h1>
      </header>

      <ImageUpload
        label="Foto do modelo"
        hint="Sua foto ou de um modelo."
        value={props.modelImage}
        onChange={props.setModelImage}
      />

      <ImageUpload
        label="Foto da peça"
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

      <div>
        <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Categoria</p>
        <div className="grid grid-cols-2 gap-2.5">
          {(["tops", "bottoms"] as const).map((c) => (
            <button
              key={c}
              onClick={() => props.setCategory(c)}
              className={`rounded-2xl border px-4 py-3.5 text-sm font-medium transition-all active:scale-[0.98] ${
                props.category === c
                  ? "border-[color:var(--brand)] bg-white/[0.03] text-white"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] text-foreground/70 hover:text-foreground"
              }`}
            >
              {c === "tops" ? "Top" : "Bottom"}
            </button>
          ))}
        </div>
      </div>

      {props.errorMessage && (
        <div className="rounded-2xl border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/[0.08] px-4 py-3 text-sm text-white/90">
          {props.errorMessage}
        </div>
      )}

      <button
        onClick={props.onSubmit}
        className="btn-brand mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium active:scale-[0.98] transition-transform"
      >
        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
        Gerar look
      </button>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Pose, proporção e caimento preservados.
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
      <div className="relative">
        <div className="glass shimmer flex h-72 w-56 items-center justify-center overflow-hidden rounded-3xl">
          <div className="shimmer-overlay" />
          <Sparkles className="h-7 w-7 text-white/80 pulse-soft" strokeWidth={1.5} />
        </div>
      </div>
      <div className="text-center">
        <h2 className="font-display text-[24px] font-semibold tracking-tight">Construindo seu look</h2>
        <p className="mt-3 text-sm text-muted-foreground">Tecido · proporção · caimento</p>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-1 rounded-full bg-white/60"
            style={{ animation: `pulse-soft 1.6s ${i * 0.2}s ease-in-out infinite` }}
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
    <div className="flex flex-1 flex-col gap-5 px-6 pt-16 pb-32 fade-in">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Resultado</p>
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight">Seu look</h1>
        </div>
        <span className="rounded-full border border-[color:var(--border-strong)] bg-white/[0.02] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {category === "tops" ? "Top" : "Bottom"}
        </span>
      </header>

      <div className="glass overflow-hidden rounded-[28px]">
        <img src={image} alt="Look gerado" className="h-auto w-full" />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2.5">
        <button
          onClick={() => { onSave(); setSaved(true); setTimeout(() => setSaved(false), 1600); }}
          className="glass col-span-3 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium active:scale-[0.98] transition-all hover:border-white/[0.10]"
        >
          {saved ? (
            <><Check className="h-4 w-4 text-[color:var(--success)]" strokeWidth={2} /> Salvo</>
          ) : (
            <><Bookmark className="h-4 w-4" strokeWidth={1.5} /> Salvar look</>
          )}
        </button>
        <button onClick={onRetry} className="btn-brand col-span-2 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3.5 text-sm font-medium active:scale-[0.98] transition-transform">
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> Testar outra
        </button>
        <button onClick={onCompare} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-3.5 text-sm font-medium active:scale-[0.98]">
          <GitCompareArrows className="h-4 w-4" strokeWidth={1.5} />
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
    <div className="flex flex-1 flex-col gap-6 px-6 pt-16 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Looks</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight tracking-[-0.03em]">Sua coleção</h1>
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
          <Shirt className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">Nenhum look salvo</p>
          <p className="max-w-[220px] text-xs leading-relaxed text-muted-foreground">Gere um look e salve para revisitar.</p>
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
    <div className="glass group relative overflow-hidden rounded-[20px] transition-all hover:border-white/[0.10]">
      <div className="aspect-[3/4] w-full">
        <img src={look.url} alt="Look salvo" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      </div>
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{look.category}</span>
        <span className="text-[10px] text-muted-foreground">
          {new Date(look.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </span>
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 border border-white/10 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

/* ─────────── Profile ─────────── */
function Profile({ lookCount }: { lookCount: number }) {
  return (
    <div className="flex flex-1 flex-col gap-7 px-6 pt-16 pb-32 fade-in">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Profile</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight tracking-[-0.03em]">Sua conta</h1>
      </header>

      <div className="glass flex items-center gap-4 rounded-3xl p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
          <User className="h-5 w-5 text-white/85" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium">Convidado</p>
          <p className="mt-1 text-xs text-muted-foreground">{lookCount} looks salvos</p>
        </div>
      </div>

      <div className="glass divide-y divide-[color:var(--border)] rounded-3xl overflow-hidden">
        {["Preferências de estilo", "Assinatura AuraFit+", "Central de ajuda", "Sobre o AuraFit"].map((item) => (
          <button key={item} className="flex w-full items-center justify-between px-5 py-4 text-sm text-foreground/90 hover:bg-white/[0.02] transition-colors">
            {item}
            <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        ))}
      </div>

      <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground">v1.0 · Beta</p>
    </div>
  );
}

/* ─────────── Bottom nav ─────────── */
function BottomNav({ current, onGo }: { current: Screen; onGo: (s: Screen) => void }) {
  const items: Array<{ screen: Screen; label: string; icon: React.ElementType }> = [
    { screen: "home", label: "Home", icon: HomeIcon },
    { screen: "tryon", label: "Create", icon: Plus },
    { screen: "wardrobe", label: "Looks", icon: Shirt },
    { screen: "profile", label: "Profile", icon: User },
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
