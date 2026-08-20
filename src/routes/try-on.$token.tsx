import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Camera,
  Sparkles,
  Upload,
  RotateCcw,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { fetchProductByToken, type Product, type ProductVariant } from "@/lib/db";
import { generateTryOnLook, recoverTryOnLook } from "@/lib/tryon.functions";

export const Route = createFileRoute("/try-on/$token")({
  head: ({ params }) => ({
    meta: [
      { title: "Experimente com AuraFit" },
      {
        name: "description",
        content: "Prove esta peça em segundos com o provador virtual AuraFit.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Experimente com AuraFit" },
      { property: "og:description", content: `Provador virtual — código ${params.token}` },
    ],
  }),
  component: TryOnPage,
});

function TryOnPage() {
  const { token } = Route.useParams();
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-product", token],
    queryFn: () => fetchProductByToken(token),
  });

  if (isLoading) {
    return (
      <Shell>
        <Spinner label="Carregando peça…" />
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell>
        <ErrorState message="Não conseguimos carregar essa peça." />
      </Shell>
    );
  }
  if (!product) throw notFound();

  return (
    <Shell>
      <Experience product={product} token={token} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain relative flex min-h-dvh w-full flex-col overflow-x-clip bg-background">
      <div className="grain-overlay" aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b border-border-strong bg-ink text-paper">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 py-3 sm:px-7 lg:px-10">
          <Link
            to="/"
            className="editorial-underline flex w-fit items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-paper/75 transition-colors hover:text-paper"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} />
            <span className="hidden sm:inline">Voltar ao início</span>
            <span className="sm:hidden">Início</span>
          </Link>
          <div className="flex items-center gap-2" aria-label="AuraFit">
            <span className="grid h-7 w-7 place-items-center border border-paper/40 bg-terracotta text-ink">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.9} />
            </span>
            <span className="font-display text-lg leading-none tracking-[-0.04em]">AuraFit</span>
          </div>
          <span className="archive-index justify-self-end text-paper/60">Provador / 01</span>
        </div>
      </header>
      <main className="relative z-[2] flex-1">{children}</main>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div
      className="grid min-h-[70vh] place-items-center px-5 py-16 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="editorial-card w-full max-w-sm p-7 sm:p-9">
        <span className="tape-label mx-auto">Abrindo acervo</span>
        <div className="pulse-soft mx-auto mt-7 grid h-16 w-16 place-items-center border border-paper/35 bg-petrol-deep">
          <Sparkles className="h-6 w-6 text-tape" strokeWidth={1.5} />
        </div>
        <p className="mt-5 font-display text-2xl text-paper">{label}</p>
        <p className="archive-index mt-2">Ficha digital em preparação</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-5 py-16 text-center" role="alert">
      <div className="paper-panel w-full max-w-sm p-7 sm:p-9">
        <span className="archive-index text-wine">Falha de leitura / 01</span>
        <p className="mt-5 font-display text-3xl leading-[0.98]">{message}</p>
        <Link
          to="/"
          className="pressable mt-7 inline-flex min-h-11 items-center justify-center gap-2 border border-ink bg-ink px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-paper"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} /> Voltar ao início
        </Link>
      </div>
    </div>
  );
}

type Stage = "intro" | "uploading" | "generating" | "recovering" | "result" | "error";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function categoryFor(product: Product): "tops" | "bottoms" {
  return product.category === "inferior" ? "bottoms" : "tops";
}

function variantPromptFor(kind: ProductVariant["option_kind"] | null): string {
  switch (kind) {
    case "color":
      return "Escolha a cor";
    case "pattern":
      return "Escolha a estampa";
    case "style":
      return "Escolha o modelo";
    default:
      return "Escolha uma opção";
  }
}

function Experience({ product, token }: { product: Product; token: string }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [statusLabel, setStatusLabel] = useState("Preparando sua foto…");
  const [modelImg, setModelImg] = useState<string | null>(null);
  const [resultImg, setResultImg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [recoverable, setRecoverable] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const inFlight = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const generate = useServerFn(generateTryOnLook);
  const recover = useServerFn(recoverTryOnLook);

  const activeVariant = useMemo(
    () => product.variants.find((v) => v.id === variantId) ?? null,
    [product.variants, variantId],
  );
  const activeImage = activeVariant?.image || product.image;
  const activePrice = activeVariant?.price ?? product.price;
  const activeBuy = activeVariant?.buyUrl || product.buyUrl;
  const promptKind = product.variants[0]?.option_kind ?? null;

  async function runGeneration(modelDataUrl: string) {
    if (!activeImage) {
      setErrorMsg("Esta peça ainda não tem imagem configurada.");
      setStage("error");
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setStage("generating");
    setStatusLabel("Gerando o seu look…");
    try {
      const res = await generate({
        data: {
          token,
          model_image: modelDataUrl,
          garment_image: activeImage,
          category: categoryFor(product),
        },
      });
      setResultImg(res.imageUrl);
      setRecoverable(null);
      setStage("result");
    } catch (err) {
      const rid = (err as { requestId?: string })?.requestId ?? null;
      const raw = err instanceof Error ? err.message : "Não conseguimos gerar o look.";
      const humane = /fetch|network|failed to fetch/i.test(raw)
        ? "Não conseguimos iniciar a experimentação. Verifique sua conexão e tente novamente."
        : raw;
      if (rid) {
        setRecoverable(rid);
        setErrorMsg(
          "Seu resultado ainda está sendo finalizado. Vamos tentar recuperar sem gerar de novo.",
        );
      } else {
        setErrorMsg(
          humane === "__PENDING__" ? "Seu resultado ainda está sendo finalizado." : humane,
        );
      }
      setStage("error");
    } finally {
      inFlight.current = false;
    }
  }

  async function runRecovery() {
    if (!recoverable || inFlight.current) return;
    inFlight.current = true;
    setStage("recovering");
    setStatusLabel("Recuperando seu resultado…");
    try {
      const res = await recover({ data: { requestId: recoverable } });
      setResultImg(res.imageUrl);
      setRecoverable(null);
      setStage("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Não foi possível recuperar o resultado.");
      setStage("error");
    } finally {
      inFlight.current = false;
    }
  }

  function readFile(f: File) {
    setErrorMsg("");
    setRecoverable(null);
    if (!ALLOWED_TYPES.includes(f.type)) {
      setErrorMsg("Formato inválido. Use JPG, PNG ou WEBP.");
      setStage("error");
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setErrorMsg("Foto muito grande (máx. 8 MB).");
      setStage("error");
      return;
    }
    setStage("uploading");
    setStatusLabel("Preparando sua foto…");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result ?? "");
      setModelImg(dataUrl);
      void runGeneration(dataUrl);
    };
    reader.onerror = () => {
      setErrorMsg("Não conseguimos ler sua foto. Tente outra.");
      setStage("error");
    };
    reader.readAsDataURL(f);
  }

  function retryGenerate() {
    if (modelImg) void runGeneration(modelImg);
  }

  function reset() {
    setModelImg(null);
    setResultImg(null);
    setErrorMsg("");
    setRecoverable(null);
    setStage("intro");
    if (fileRef.current) fileRef.current.value = "";
    if (camRef.current) camRef.current.value = "";
  }

  const busy = stage === "uploading" || stage === "generating" || stage === "recovering";
  const activeStep = stage === "intro" ? 1 : stage === "result" ? 3 : 2;

  return (
    <div className="fade-in mx-auto w-full max-w-[1440px] px-4 pb-14 pt-5 sm:px-7 sm:pt-8 lg:px-10 lg:pb-20">
      <div className="mb-5 flex items-end justify-between gap-5 border-b border-border-strong pb-4 sm:mb-7">
        <div>
          <span className="archive-index">Prova particular / AuraFit</span>
          <h1 className="mt-2 max-w-3xl font-display text-[clamp(2.35rem,6vw,5.6rem)] leading-[0.84] tracking-[-0.055em] text-paper">
            Vista antes de decidir.
          </h1>
        </div>
        <p className="hidden max-w-[19rem] text-right text-xs leading-relaxed text-muted-foreground md:block">
          Uma prova visual construída a partir da sua foto e da peça selecionada.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-7 xl:gap-10">
        <aside className="paper-panel overflow-hidden lg:sticky lg:top-[4.6rem]">
          <div className="flex items-center justify-between border-b border-ink bg-tape px-4 py-2 text-ink sm:px-5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
              Ficha da peça
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em]">AF–001</span>
          </div>

          <div className="image-reveal relative aspect-[5/6] w-full overflow-hidden bg-paper-deep sm:aspect-[4/5] lg:aspect-[5/6] xl:aspect-[4/5]">
            <span className="absolute left-4 top-4 z-10 border border-ink/30 bg-paper px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-ink">
              Frente / referência
            </span>
            <span
              className="absolute bottom-0 left-5 top-0 z-10 border-l border-dashed border-ink/20"
              aria-hidden="true"
            />
            <span
              className="absolute bottom-5 left-0 right-0 z-10 border-t border-dashed border-ink/20"
              aria-hidden="true"
            />
            {activeImage ? (
              <img
                key={activeImage}
                src={activeImage}
                alt={product.name}
                className="crossfade h-full w-full object-contain p-5 sm:p-8"
              />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center font-mono text-xs uppercase tracking-[0.12em] text-ink/55">
                Sem imagem de referência
              </div>
            )}
          </div>

          <div className="border-t border-ink px-5 py-5 sm:px-6 sm:py-6">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-wine">
              Você está experimentando
            </p>
            <div className="mt-2 flex items-start justify-between gap-5">
              <div className="min-w-0">
                <h2 className="font-display text-[clamp(1.8rem,5vw,3rem)] leading-[0.92] text-ink">
                  {product.name}
                </h2>
                {activeVariant && (
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-petrol-deep">
                    {activeVariant.display_name}
                  </p>
                )}
              </div>
              {activePrice > 0 && (
                <p className="shrink-0 border-l border-ink/25 pl-4 font-mono text-xs font-bold text-ink">
                  R$ {activePrice.toFixed(2).replace(".", ",")}
                </p>
              )}
            </div>

            {product.variants.length > 1 && stage === "intro" && (
              <section
                className="mt-5 border-t border-ink/25 pt-4"
                aria-labelledby="variant-heading"
              >
                <p
                  id="variant-heading"
                  className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink/65"
                >
                  {variantPromptFor(promptKind)}
                </p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                  {product.variants.map((variant) => {
                    const active = variant.id === variantId;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setVariantId(variant.id)}
                        aria-pressed={active}
                        className={`pressable flex min-w-[5.2rem] shrink-0 flex-col border p-1.5 text-left ${
                          active
                            ? "border-ink bg-ink text-paper shadow-[3px_3px_0_var(--terracotta)]"
                            : "border-ink/30 bg-paper text-ink hover:border-ink"
                        }`}
                      >
                        <span
                          className={`block aspect-square w-full overflow-hidden ${active ? "bg-ink-soft" : "bg-paper-deep"}`}
                        >
                          {variant.image ? (
                            <img
                              src={variant.image}
                              alt={variant.display_name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </span>
                        <span className="mt-1.5 max-w-[4.4rem] truncate px-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em]">
                          {variant.display_name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </aside>

        <section className="editorial-card relative min-h-[34rem] overflow-hidden p-5 sm:p-8 lg:min-h-[42rem] lg:p-10 xl:p-12">
          <div className="absolute right-0 top-0 h-2 w-24 bg-terracotta" aria-hidden="true" />
          <div className="absolute right-0 top-4 h-2 w-14 bg-tape" aria-hidden="true" />

          <ol
            className="grid grid-cols-3 border-y border-border-strong"
            aria-label="Etapas da prova"
          >
            {["Sua foto", "Montagem", "Resultado"].map((label, index) => {
              const number = index + 1;
              const reached = activeStep >= number;
              const current = activeStep === number;
              return (
                <li
                  key={label}
                  aria-current={current ? "step" : undefined}
                  className={`flex min-w-0 items-center gap-2 border-r border-border-strong px-2 py-3 last:border-r-0 sm:px-4 ${
                    current ? "bg-paper text-ink" : reached ? "text-paper" : "text-muted-foreground"
                  }`}
                >
                  <span className="font-mono text-[9px] font-bold">0{number}</span>
                  <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] sm:text-[11px]">
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="pt-8 sm:pt-10">
            {stage === "intro" && (
              <section aria-labelledby="upload-heading" className="fade-up">
                <span className="tape-label">Etapa 01 / retrato</span>
                <h2
                  id="upload-heading"
                  className="mt-5 max-w-[11ch] font-display text-[clamp(3rem,7vw,6.7rem)] leading-[0.82] tracking-[-0.055em] text-paper"
                >
                  Traga você para a prova.
                </h2>
                <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Envie uma foto de corpo inteiro ou abra a câmera. Uma imagem bem iluminada e de
                  frente ajuda a peça a encontrar o caimento certo.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="btn-brand pressable flex min-h-24 items-center justify-between gap-4 border border-paper/30 px-5 py-4 text-left disabled:opacity-60"
                  >
                    <span>
                      <span className="block text-xs font-bold uppercase tracking-[0.12em]">
                        Enviar foto
                      </span>
                      <span className="mt-1 block text-[11px] text-ink/70">
                        JPG, PNG ou WEBP · até 8 MB
                      </span>
                    </span>
                    <Upload className="h-6 w-6 shrink-0" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => camRef.current?.click()}
                    disabled={busy}
                    className="pressable flex min-h-24 items-center justify-between gap-4 border border-paper/35 bg-paper px-5 py-4 text-left text-ink shadow-[4px_4px_0_var(--petrol)] disabled:opacity-60"
                  >
                    <span>
                      <span className="block text-xs font-bold uppercase tracking-[0.12em]">
                        Abrir câmera
                      </span>
                      <span className="mt-1 block text-[11px] text-ink/65">
                        Capture agora, de frente
                      </span>
                    </span>
                    <Camera className="h-6 w-6 shrink-0" strokeWidth={1.5} />
                  </button>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) readFile(file);
                  }}
                />
                <input
                  ref={camRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) readFile(file);
                  }}
                />

                <div className="mt-8 grid gap-3 border-t border-border-strong pt-5 text-[11px] leading-relaxed text-muted-foreground sm:grid-cols-3">
                  <p>
                    <strong className="block text-paper">01 · Luz</strong> Prefira um ambiente
                    claro.
                  </p>
                  <p>
                    <strong className="block text-paper">02 · Postura</strong> Fique de frente para
                    a câmera.
                  </p>
                  <p>
                    <strong className="block text-paper">03 · Enquadramento</strong> Mostre o corpo
                    inteiro.
                  </p>
                </div>
              </section>
            )}

            {(stage === "uploading" || stage === "generating" || stage === "recovering") && (
              <section
                className="fade-in relative flex min-h-[28rem] flex-col justify-between overflow-hidden border border-border-strong bg-surface p-6 sm:p-9"
                role="status"
                aria-live="polite"
              >
                <div className="scan-line" aria-hidden="true" />
                <div className="flex items-start justify-between gap-4">
                  <span className="tape-label">Etapa 02 / montagem</span>
                  <Sparkles className="pulse-soft h-7 w-7 text-terracotta" strokeWidth={1.4} />
                </div>
                <div className="py-10">
                  <p className="max-w-[10ch] font-display text-[clamp(3.2rem,8vw,7rem)] leading-[0.82] tracking-[-0.05em] text-paper">
                    Ajustando o caimento.
                  </p>
                  <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {statusLabel} Isso pode levar alguns segundos.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2" aria-hidden="true">
                  <span className="h-2 bg-petrol" />
                  <span className="pulse-soft h-2 bg-terracotta" />
                  <span className="h-2 bg-tape/35" />
                </div>
              </section>
            )}

            {stage === "error" && (
              <section
                className="fade-up border border-terracotta bg-surface p-6 sm:p-9"
                role="alert"
              >
                <span className="tape-label">Ajuste necessário</span>
                <h2 className="mt-5 max-w-[10ch] font-display text-[clamp(2.9rem,7vw,5.8rem)] leading-[0.84] tracking-[-0.05em] text-paper">
                  A prova saiu do molde.
                </h2>
                <p className="mt-6 max-w-xl border-l-2 border-terracotta pl-4 text-sm leading-relaxed text-paper/85">
                  {errorMsg}
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={reset}
                    disabled={busy}
                    className="pressable inline-flex min-h-12 items-center justify-center gap-2 border border-paper/35 bg-paper px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-[4px_4px_0_var(--petrol)] disabled:opacity-60"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={1.8} /> Nova foto
                  </button>
                  {recoverable ? (
                    <button
                      type="button"
                      onClick={runRecovery}
                      disabled={busy}
                      className="btn-brand pressable inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] disabled:opacity-60"
                    >
                      <RefreshCw className="h-4 w-4" strokeWidth={1.8} /> Recuperar resultado
                    </button>
                  ) : modelImg ? (
                    <button
                      type="button"
                      onClick={retryGenerate}
                      disabled={busy}
                      className="btn-brand pressable inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] disabled:opacity-60"
                    >
                      <Sparkles className="h-4 w-4" strokeWidth={1.8} /> Tentar de novo
                    </button>
                  ) : null}
                </div>
              </section>
            )}

            {stage === "result" && (
              <section className="fade-up">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <span className="tape-label">Etapa 03 / resultado</span>
                    <h2 className="mt-5 font-display text-[clamp(3rem,7vw,6rem)] leading-[0.84] tracking-[-0.05em] text-paper">
                      A prova está pronta.
                    </h2>
                  </div>
                  <p className="max-w-[15rem] text-xs leading-relaxed text-muted-foreground">
                    Compare a referência com o novo look antes de seguir para a loja.
                  </p>
                </div>

                <div className="mt-7 grid gap-px border border-border-strong bg-border-strong sm:grid-cols-2">
                  {modelImg && <ImageTile src={modelImg} label="Você" />}
                  {resultImg && <ImageTile src={resultImg} label="Com a peça" />}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="pressable inline-flex min-h-12 items-center justify-center gap-2 border border-paper/35 bg-paper px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-[4px_4px_0_var(--petrol)]"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={1.8} /> Nova foto
                  </button>
                  {activeBuy ? (
                    <a
                      href={activeBuy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-brand pressable inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-[0.1em]"
                    >
                      <ShoppingBag className="h-4 w-4" strokeWidth={1.8} /> Comprar esta peça
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-h-12 items-center justify-center gap-2 border border-terracotta/45 bg-terracotta/35 px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-paper/70"
                    >
                      <ShoppingBag className="h-4 w-4" strokeWidth={1.8} /> Comprar esta peça
                    </button>
                  )}
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ImageTile({ src, label }: { src: string; label: string }) {
  return (
    <figure className="image-reveal relative bg-ink-soft">
      <img src={src} alt={label} className="aspect-[3/4] w-full object-contain" />
      <figcaption className="absolute bottom-3 left-3 border border-ink bg-tape px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink shadow-[2px_2px_0_var(--terracotta)]">
        {label}
      </figcaption>
    </figure>
  );
}
