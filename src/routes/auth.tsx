import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Ruler,
  Scissors,
  Shirt,
  Store,
} from "lucide-react";
import {
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  useAuth,
} from "@/hooks/use-auth";

type Mode = "login" | "signup" | "reset";
type FocusTarget = "store" | "email" | "password" | null;

const MODE_COPY: Record<
  Mode,
  { index: string; eyebrow: string; title: string; description: string }
> = {
  login: {
    index: "01",
    eyebrow: "Acesso ao estúdio",
    title: "Sua curadoria continua aqui.",
    description: "Entre para organizar peças, experiências e provadores da sua loja.",
  },
  signup: {
    index: "02",
    eyebrow: "Novo ateliê",
    title: "Abra as portas da sua coleção.",
    description: "Crie o espaço digital da sua loja e comece a montar o acervo.",
  },
  reset: {
    index: "03",
    eyebrow: "Recuperar acesso",
    title: "Vamos encontrar o fio de volta.",
    description: "Informe seu email e enviaremos o caminho para uma nova senha.",
  },
};

const FOCUS_COPY: Record<Exclude<FocusTarget, null>, { label: string; note: string }> = {
  store: { label: "Etiqueta", note: "O nome que acompanha cada experiência da sua loja." },
  email: { label: "Identidade", note: "O endereço que reconhece o seu ateliê digital." },
  password: { label: "Fecho", note: "Uma camada privada entre você e a sua coleção." },
};

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — AuraFit Studio" },
      {
        name: "description",
        content: "Acesse o AuraFit Studio para gerenciar seus produtos e QR Codes.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeField, setActiveField] = useState<FocusTarget>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && session) navigate({ to: "/studio", replace: true });
  }, [session, authLoading, navigate]);

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setInfo(null);
    setActiveField(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithPassword(email, password);
        navigate({ to: "/studio", replace: true });
      } else if (mode === "signup") {
        if (storeName.trim().length < 2) throw new Error("Informe o nome da loja.");
        await signUpWithPassword(email, password, storeName.trim());
        navigate({ to: "/studio", replace: true });
      } else {
        await requestPasswordReset(email);
        setInfo("Enviamos um link de recuperação para o seu email.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setLoading(false);
    }
  }

  const copy = MODE_COPY[mode];
  const focusCopy = activeField ? FOCUS_COPY[activeField] : null;

  return (
    <div className="atelier-auth-shell min-h-dvh overflow-hidden bg-[#f3eee4] text-[#172019]">
      <header className="relative z-30 flex h-[72px] items-center justify-between border-b border-[#172019]/15 px-5 sm:px-8 lg:h-[84px] lg:px-10">
        <Link
          to="/"
          className="group flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f3eee4]"
          aria-label="Voltar para a página inicial"
        >
          <span className="grid h-9 w-9 place-items-center bg-[#172019] text-[10px] font-semibold tracking-[0.08em] text-[#f8f4ec] transition-transform group-hover:-rotate-3">
            AF
          </span>
          <span className="leading-none">
            <span className="block text-sm font-semibold tracking-[-0.02em]">AuraFit</span>
            <span className="mt-1 hidden text-[9px] uppercase tracking-[0.24em] text-[#172019]/55 sm:block">
              Studio
            </span>
          </span>
        </Link>

        <p className="hidden items-center gap-2 text-[10px] font-medium uppercase tracking-[0.23em] text-[#172019]/55 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e45e38]" />
          Provador digital para moda
        </p>

        <Link
          to="/"
          className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-[#e45e38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          Voltar
        </Link>
      </header>

      <main className="grid min-h-[calc(100dvh-72px)] lg:min-h-[calc(100dvh-84px)] lg:grid-cols-[minmax(0,1.17fr)_minmax(420px,0.83fr)]">
        <section className="atelier-auth-stage relative min-h-[250px] overflow-hidden border-b border-[#172019]/15 bg-[#d6dfc9] lg:min-h-0 lg:border-r lg:border-b-0">
          <div className="atelier-auth-stage-grid absolute inset-0 opacity-45" aria-hidden="true">
            <span className="absolute inset-y-0 left-[23%] w-px bg-[#172019]/20" />
            <span className="absolute inset-y-0 right-[17%] w-px bg-[#172019]/12" />
            <span className="absolute inset-x-0 top-[32%] h-px bg-[#172019]/18" />
            <span className="absolute inset-x-0 bottom-[19%] h-px bg-[#172019]/12" />
          </div>
          <div className="absolute inset-x-0 top-0 h-px bg-[#172019]/25" aria-hidden="true" />

          <div className="relative z-10 flex h-full min-h-[250px] flex-col px-5 py-6 sm:px-8 lg:min-h-[calc(100dvh-84px)] lg:px-10 lg:py-9">
            <div className="flex items-start justify-between gap-6">
              <p className="max-w-[210px] text-[10px] font-medium uppercase leading-relaxed tracking-[0.2em] text-[#172019]/62">
                Coleções digitais
                <br />
                com presença real
              </p>
              <div className="flex items-center gap-4 text-[9px] font-medium uppercase tracking-[0.2em] text-[#172019]/55">
                <span>SP · BR</span>
                <span className="h-px w-10 bg-[#172019]/35" />
                <span>Est. 2026</span>
              </div>
            </div>

            <div className="relative flex flex-1 items-center justify-center py-4 lg:py-8">
              <div
                className={`atelier-pattern-ring absolute aspect-square w-[218px] rounded-full border border-[#172019]/25 transition-[transform,border-color] duration-700 motion-safe:animate-[spin_26s_linear_infinite] sm:w-[290px] lg:w-[min(33vw,470px)] ${
                  activeField ? "scale-[1.04] border-[#e45e38]/55" : "scale-100"
                }`}
                aria-hidden="true"
              >
                <span className="absolute top-1/2 -left-1.5 h-3 w-3 -translate-y-1/2 rounded-full border border-[#172019]/35 bg-[#f0c84b]" />
                <span className="absolute top-[14%] right-[14%] h-2 w-2 rounded-full bg-[#e45e38]" />
              </div>
              <div
                className={`atelier-pattern-ring atelier-pattern-ring--reverse absolute aspect-square w-[162px] rounded-full border border-dashed border-[#172019]/25 transition-transform duration-700 motion-safe:animate-[spin_32s_linear_infinite_reverse] sm:w-[220px] lg:w-[min(25vw,350px)] ${
                  activeField === "password" ? "rotate-12 scale-95" : "rotate-0 scale-100"
                }`}
                aria-hidden="true"
              />
              <div
                className="absolute aspect-square w-[104px] rounded-full border border-[#172019]/20 sm:w-[142px] lg:w-[min(17vw,236px)]"
                aria-hidden="true"
              />

              <div className="atelier-orbit-ticket absolute left-[8%] top-[22%] hidden -rotate-6 border border-[#172019]/25 bg-[#f3eee4] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] shadow-[4px_4px_0_#172019] motion-safe:animate-[pulse_5s_ease-in-out_infinite] sm:block lg:left-[12%] lg:top-[24%]">
                <span className="flex items-center gap-2">
                  <Scissors className="h-3.5 w-3.5" aria-hidden="true" /> corte 01
                </span>
              </div>
              <div className="atelier-orbit-ticket atelier-orbit-ticket--late absolute right-[7%] bottom-[19%] hidden rotate-3 bg-[#e45e38] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white shadow-[4px_4px_0_#172019] motion-safe:animate-[pulse_6s_ease-in-out_infinite] sm:block lg:right-[10%] lg:bottom-[23%]">
                prova em movimento
              </div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div
                  className={`grid h-14 w-14 place-items-center border border-[#172019]/25 bg-[#f3eee4] shadow-[6px_6px_0_#172019] transition-transform duration-500 lg:h-[72px] lg:w-[72px] ${activeField ? "-translate-y-1 -rotate-2" : ""}`}
                >
                  <Shirt className="h-6 w-6 lg:h-8 lg:w-8" strokeWidth={1.35} aria-hidden="true" />
                </div>
                <div
                  key={activeField ?? mode}
                  className="auth-copy-swap mt-6 max-w-[290px] lg:mt-8"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#e45e38]">
                    {focusCopy?.label ?? "AuraFit em movimento"}
                  </p>
                  <p className="mt-2 text-balance font-display text-lg font-semibold leading-tight tracking-[-0.035em] lg:text-2xl">
                    {focusCopy?.note ?? "Um camarim digital desenhado ao redor da sua coleção."}
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden grid-cols-3 border-t border-[#172019]/20 pt-5 lg:grid">
              {[
                ["01", "Vista a imagem"],
                ["02", "Organize o acervo"],
                ["03", "Publique a experiência"],
              ].map(([index, label]) => (
                <div
                  key={index}
                  className="flex items-start gap-3 border-r border-[#172019]/15 pr-4 last:border-r-0 last:pl-4"
                >
                  <span className="font-mono text-[9px] text-[#e45e38]">{index}</span>
                  <span className="text-[9px] font-semibold uppercase leading-relaxed tracking-[0.17em]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="atelier-auth-panel relative flex bg-[#fbf8f1] px-5 py-10 sm:px-10 lg:items-center lg:px-[clamp(2.5rem,5vw,6.5rem)] lg:py-12">
          <div className="mx-auto w-full max-w-[480px]">
            <div className="auth-reveal flex items-center justify-between border-b border-[#172019]/15 pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#172019]/55">
                Ficha {copy.index} / 03
              </p>
              <div className="flex items-center gap-2" aria-label="Tipo de acesso">
                {(["login", "signup"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => selectMode(item)}
                    aria-pressed={mode === item}
                    className={`relative px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38] ${
                      mode === item
                        ? "text-[#172019] after:absolute after:inset-x-1 after:-bottom-[17px] after:h-0.5 after:bg-[#e45e38]"
                        : "text-[#172019]/42 hover:text-[#172019]"
                    }`}
                  >
                    {item === "login" ? "Entrar" : "Criar conta"}
                  </button>
                ))}
              </div>
            </div>

            <div key={mode} className="auth-reveal mt-9 lg:mt-12">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#e45e38]" aria-hidden="true" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e45e38]">
                  {copy.eyebrow}
                </p>
              </div>
              <h1 className="mt-4 max-w-[440px] text-balance font-display text-[clamp(2.25rem,4vw,4.35rem)] font-semibold leading-[0.94] tracking-[-0.055em]">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-[390px] text-sm leading-6 text-[#172019]/62">
                {copy.description}
              </p>
            </div>

            <form
              onSubmit={onSubmit}
              className="mt-8 flex flex-col gap-4"
              aria-describedby="auth-feedback"
            >
              {mode === "signup" && (
                <Field
                  id="store-name"
                  Icon={Store}
                  label="Nome da loja"
                  value={storeName}
                  onChange={setStoreName}
                  onFocus={() => setActiveField("store")}
                  onBlur={() => setActiveField(null)}
                  placeholder="Ex.: Casa Aurora"
                  autoComplete="organization"
                  required
                />
              )}
              <Field
                id="auth-email"
                Icon={Mail}
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                onFocus={() => setActiveField("email")}
                onBlur={() => setActiveField(null)}
                placeholder="voce@sualoja.com"
                autoComplete="email"
                inputMode="email"
                required
              />
              {mode !== "reset" && (
                <Field
                  id="auth-password"
                  Icon={LockKeyhole}
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  onFocus={() => setActiveField("password")}
                  onBlur={() => setActiveField(null)}
                  placeholder="Sua senha"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  action={
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="grid h-9 w-9 place-items-center text-[#172019]/50 transition-colors hover:text-[#172019] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38]"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />
              )}

              <div
                id="auth-feedback"
                aria-live="polite"
                aria-atomic="true"
                className={error || info ? "min-h-10" : "sr-only"}
              >
                {error && (
                  <p
                    role="alert"
                    className="border-l-2 border-[#c33d2e] bg-[#c33d2e]/8 px-3 py-2.5 text-xs leading-5 text-[#9f2f24]"
                  >
                    {error}
                  </p>
                )}
                {info && (
                  <p className="border-l-2 border-[#58735b] bg-[#58735b]/8 px-3 py-2.5 text-xs leading-5 text-[#36523b]">
                    {info}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-submit group mt-1 flex min-h-14 w-full items-stretch bg-[#172019] text-left text-[#fbf8f1] transition-[transform,background-color] hover:bg-[#243129] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38] focus-visible:ring-offset-4 focus-visible:ring-offset-[#fbf8f1]"
              >
                <span className="flex flex-1 items-center px-5 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {loading ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />{" "}
                      Aguarde…
                    </>
                  ) : mode === "login" ? (
                    "Entrar no estúdio"
                  ) : mode === "signup" ? (
                    "Criar meu estúdio"
                  ) : (
                    "Enviar link de acesso"
                  )}
                </span>
                <span
                  className="grid w-14 place-items-center bg-[#e45e38] text-white transition-transform group-hover:-translate-x-0.5"
                  aria-hidden="true"
                >
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#172019]/15 pt-5 text-xs text-[#172019]/58">
              {mode === "login" && (
                <>
                  <p>A senha ficou para trás?</p>
                  <button
                    type="button"
                    onClick={() => selectMode("reset")}
                    className="font-semibold text-[#172019] underline decoration-[#e45e38] decoration-2 underline-offset-4 hover:text-[#e45e38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38]"
                  >
                    Recuperar acesso
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  <p>Já tem uma coleção aqui?</p>
                  <button
                    type="button"
                    onClick={() => selectMode("login")}
                    className="font-semibold text-[#172019] underline decoration-[#e45e38] decoration-2 underline-offset-4 hover:text-[#e45e38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38]"
                  >
                    Entrar na conta
                  </button>
                </>
              )}
              {mode === "reset" && (
                <>
                  <p>Lembrou da senha?</p>
                  <button
                    type="button"
                    onClick={() => selectMode("login")}
                    className="font-semibold text-[#172019] underline decoration-[#e45e38] decoration-2 underline-offset-4 hover:text-[#e45e38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38]"
                  >
                    Voltar para entrar
                  </button>
                </>
              )}
            </div>
          </div>

          <Ruler
            className="pointer-events-none absolute right-7 bottom-6 hidden h-5 w-5 rotate-90 text-[#172019]/25 xl:block"
            strokeWidth={1.4}
            aria-hidden="true"
          />
        </section>
      </main>
    </div>
  );
}

function Field({
  id,
  Icon,
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  required,
  action,
}: {
  id: string;
  Icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="auth-field group border border-[#172019]/22 bg-[#fbf8f1] px-4 py-3 transition-[border-color,transform,box-shadow] focus-within:-translate-y-px focus-within:border-[#e45e38] focus-within:shadow-[4px_4px_0_rgba(228,94,56,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#172019]/55 group-focus-within:text-[#b94127]"
        >
          {label}
          {required && (
            <span className="ml-1 text-[#e45e38]" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#172019]/35">
          campo
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <Icon
          className="h-4 w-4 shrink-0 text-[#172019]/40 transition-colors group-focus-within:text-[#e45e38]"
          strokeWidth={1.6}
          aria-hidden="true"
        />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          aria-required={required || undefined}
          className="min-w-0 flex-1 bg-transparent py-1 text-[15px] text-[#172019] outline-none placeholder:text-[#172019]/32"
        />
        {action}
      </div>
    </div>
  );
}
