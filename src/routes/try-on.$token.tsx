import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Camera, Sparkles, Upload, RotateCcw, ShoppingBag } from "lucide-react";
import { fetchProductByToken, type Product } from "@/lib/db";
import { generateTryOnLook } from "@/lib/tryon.functions";
import beforeImg from "@/assets/ba-1-before.jpg";

export const Route = createFileRoute("/try-on/$token")({
  head: ({ params }) => ({
    meta: [
      { title: "Experimente com AuraFit" },
      { name: "description", content: "Prove esta peça em segundos com o provador virtual AuraFit." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Experimente com AuraFit" },
      { property: "og:description", content: `Provador virtual — código ${params.token}` },
    ],
  }),
  component: TryOnPage,
});

function TryOnPage() {
  const { token } = Route.useParams();
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["public-product", token],
    queryFn: () => fetchProductByToken(token),
  });

  if (isLoading) return <Shell><Spinner label="Carregando peça…" /></Shell>;
  if (error) return <Shell><ErrorState message="Não conseguimos carregar essa peça." /></Shell>;
  if (!product) throw notFound();

  return <Shell><Experience product={product} token={token} /></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[color:var(--border)] bg-background/80 px-5 py-3.5 backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} /> Início
        </Link>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-brand" strokeWidth={1.7} />
          <span className="text-[13px] font-medium tracking-tight">AuraFit</span>
        </div>
        <span className="w-[52px]" />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 ring-1 ring-brand/30">
          <Sparkles className="h-5 w-5 animate-pulse text-brand" strokeWidth={1.7} />
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 text-center">
      <p className="text-[13px] text-muted-foreground">{message}</p>
    </div>
  );
}

type Stage = "intro" | "generating" | "result";

function Experience({ product }: { product: Product }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [modelImg, setModelImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  function readFile(f: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      setModelImg(String(ev.target?.result ?? ""));
      setStage("generating");
      // Mock generation — arquitetura pronta para FAL depois.
      setTimeout(() => setStage("result"), 1600);
    };
    reader.readAsDataURL(f);
  }

  function reset() {
    setModelImg(null);
    setStage("intro");
  }

  return (
    <div className="flex flex-col gap-6 px-5 pb-10 pt-6 fade-in">
      <section className="glass overflow-hidden rounded-3xl">
        <div className="aspect-[4/5] w-full bg-white/[0.04]">
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              Sem imagem
            </div>
          )}
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Você está experimentando</p>
          <h1 className="mt-1 font-display text-[22px] font-semibold tracking-[-0.02em]">{product.name}</h1>
          {product.price > 0 && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </p>
          )}
        </div>
      </section>

      {stage === "intro" && (
        <section className="flex flex-col gap-3">
          <p className="text-[13px] text-muted-foreground">
            Envie ou tire uma foto sua para ver como esta peça fica em você.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-[13px] font-medium text-white transition-transform active:scale-[0.99]"
          >
            <Upload className="h-4 w-4" strokeWidth={1.8} /> Enviar foto
          </button>
          <button
            onClick={() => camRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-3.5 text-[13px] font-medium hover:bg-white/[0.06]"
          >
            <Camera className="h-4 w-4" strokeWidth={1.8} /> Tirar foto
          </button>
          <input
            ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
          />
          <input
            ref={camRef} type="file" accept="image/*" capture="user" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
          />
        </section>
      )}

      {stage === "generating" && (
        <section className="glass flex flex-col items-center gap-4 rounded-3xl p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 ring-1 ring-brand/30">
            <Sparkles className="h-5 w-5 animate-pulse text-brand" strokeWidth={1.7} />
          </div>
          <p className="text-center text-[13px] text-muted-foreground">
            Gerando o seu look… isso leva alguns segundos.
          </p>
        </section>
      )}

      {stage === "result" && (
        <section className="flex flex-col gap-3">
          <div className="glass overflow-hidden rounded-3xl">
            <div className="grid grid-cols-2 gap-px bg-white/[0.06]">
              <ImageTile src={modelImg ?? beforeImg} label="Você" />
              <ImageTile src={afterImg} label="Com a peça" />
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Prévia demonstrativa. Resultado real gerado por IA em breve.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-3 text-[12.5px] font-medium hover:bg-white/[0.06]"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} /> Nova foto
            </button>
            {product.buyUrl ? (
              <a
                href={product.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand py-3 text-[12.5px] font-medium text-white transition-transform active:scale-[0.99]"
              >
                <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.8} /> Comprar
              </a>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand/40 py-3 text-[12.5px] font-medium text-white opacity-70"
              >
                <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.8} /> Comprar
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ImageTile({ src, label }: { src: string; label: string }) {
  return (
    <div className="relative">
      <img src={src} alt={label} className="aspect-[3/4] w-full object-cover" />
      <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
        {label}
      </span>
    </div>
  );
}
