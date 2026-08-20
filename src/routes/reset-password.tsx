import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Scissors,
  ShieldCheck,
} from "lucide-react";
import { updatePassword } from "@/hooks/use-auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Redefinir senha — AuraFit Studio" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<"password" | "confirm" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("A senha deve ter ao menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate({ to: "/studio", replace: true }), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível redefinir.");
    } finally {
      setLoading(false);
    }
  }

  const strength = Math.min(
    3,
    password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length > 0 ? 1 : 0,
  );

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
          <span className="h-1.5 w-1.5 rounded-full bg-[#e45e38]" /> Proteção da conta
        </p>
        <Link
          to="/auth"
          className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-[#e45e38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          Voltar
        </Link>
      </header>

      <main className="grid min-h-[calc(100dvh-72px)] lg:min-h-[calc(100dvh-84px)] lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <section className="atelier-auth-stage relative min-h-[235px] overflow-hidden border-b border-[#172019]/15 bg-[#e7c9b6] lg:min-h-0 lg:border-r lg:border-b-0">
          <div className="atelier-auth-stage-grid absolute inset-0 opacity-35" aria-hidden="true">
            <span className="absolute inset-y-0 left-[23%] w-px bg-[#172019]/20" />
            <span className="absolute inset-y-0 right-[17%] w-px bg-[#172019]/12" />
            <span className="absolute inset-x-0 top-[32%] h-px bg-[#172019]/18" />
            <span className="absolute inset-x-0 bottom-[19%] h-px bg-[#172019]/12" />
          </div>
          <div className="relative flex h-full min-h-[235px] flex-col px-5 py-6 sm:px-8 lg:min-h-[calc(100dvh-84px)] lg:px-10 lg:py-9">
            <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.19em] text-[#172019]/55">
              <span>Ficha de segurança</span>
              <span>Ref. AF–03</span>
            </div>

            <div className="relative flex flex-1 items-center justify-center py-4">
              <div
                className={`atelier-pattern-ring absolute aspect-square w-[220px] rounded-full border border-[#172019]/23 transition-transform duration-700 motion-safe:animate-[spin_26s_linear_infinite] sm:w-[292px] lg:w-[min(34vw,470px)] ${focusedField ? "scale-105" : "scale-100"}`}
                aria-hidden="true"
              >
                <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rounded-full bg-[#e45e38]" />
                <span className="absolute -right-2 bottom-[28%] border border-[#172019]/25 bg-[#f3eee4] px-2 py-1 font-mono text-[8px]">
                  08+
                </span>
              </div>
              <div
                className={`atelier-pattern-ring atelier-pattern-ring--reverse absolute aspect-square w-[160px] rounded-full border border-dashed border-[#172019]/22 transition-transform duration-700 motion-safe:animate-[spin_32s_linear_infinite_reverse] sm:w-[214px] lg:w-[min(25vw,340px)] ${focusedField === "confirm" ? "-rotate-12 scale-95" : "rotate-0"}`}
                aria-hidden="true"
              />

              <div className="relative z-10 text-center">
                <div
                  className={`mx-auto grid h-16 w-16 place-items-center bg-[#172019] text-[#f3eee4] shadow-[7px_7px_0_#e45e38] transition-transform duration-500 ${focusedField ? "-translate-y-1 rotate-2" : ""}`}
                >
                  <ShieldCheck className="h-7 w-7" strokeWidth={1.35} aria-hidden="true" />
                </div>
                <div key={focusedField ?? "rest"} className="auth-copy-swap mt-6 max-w-[300px]">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#9a371f]">
                    {focusedField === "confirm"
                      ? "Conferência final"
                      : focusedField === "password"
                        ? "Novo acabamento"
                        : "Ajuste protegido"}
                  </p>
                  <p className="mt-2 text-balance font-display text-lg font-semibold leading-tight tracking-[-0.035em] lg:text-2xl">
                    {focusedField === "confirm"
                      ? "Repita o desenho para garantir que tudo se encaixa."
                      : focusedField === "password"
                        ? "Escolha uma senha longa, única e só sua."
                        : "Um pequeno ajuste antes de voltar ao seu acervo."}
                  </p>
                </div>
              </div>

              <div className="atelier-orbit-ticket absolute left-[9%] top-[20%] hidden -rotate-6 border border-[#172019]/25 bg-[#f3eee4] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] shadow-[4px_4px_0_#172019] motion-safe:animate-[pulse_5s_ease-in-out_infinite] sm:flex sm:items-center sm:gap-2 lg:left-[12%] lg:top-[25%]">
                <Scissors className="h-3.5 w-3.5" aria-hidden="true" /> novo corte
              </div>
            </div>

            <div className="hidden grid-cols-3 border-t border-[#172019]/18 pt-5 lg:grid">
              {["8+ caracteres", "duas conferências", "acesso renovado"].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-2 border-r border-[#172019]/15 pr-3 last:border-r-0 last:pl-3"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-[#172019]/25 font-mono text-[8px]">
                    {index + 1}
                  </span>
                  <span className="text-[8px] font-semibold uppercase tracking-[0.15em]">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="atelier-auth-panel flex bg-[#fbf8f1] px-5 py-10 sm:px-10 lg:items-center lg:px-[clamp(2.5rem,5vw,6.5rem)] lg:py-12">
          <div className="mx-auto w-full max-w-[480px]">
            <div className="auth-reveal flex items-center justify-between border-b border-[#172019]/15 pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#172019]/55">
                Ficha 03 / 03
              </p>
              <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#58735b]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#58735b]" /> conexão segura
              </p>
            </div>

            <div className="auth-reveal mt-9 lg:mt-12">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#e45e38]" aria-hidden="true" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b94127]">
                  Redefinir acesso
                </p>
              </div>
              <h1 className="mt-4 max-w-[440px] text-balance font-display text-[clamp(2.4rem,4vw,4.5rem)] font-semibold leading-[0.94] tracking-[-0.055em]">
                Uma nova senha, o mesmo acervo.
              </h1>
              <p className="mt-5 max-w-[390px] text-sm leading-6 text-[#172019]/62">
                Use pelo menos oito caracteres. Depois do ajuste, você seguirá direto para o
                estúdio.
              </p>
            </div>

            <form
              onSubmit={onSubmit}
              className="mt-8 flex flex-col gap-4"
              aria-describedby="reset-feedback"
            >
              <PasswordField
                id="new-password"
                label="Nova senha"
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                autoComplete="new-password"
              />

              <div
                className="flex items-center gap-2 px-0.5"
                aria-label={`Força visual da senha: ${strength} de 3`}
              >
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`h-1 flex-1 transition-colors ${strength >= step ? "bg-[#e45e38]" : "bg-[#172019]/12"}`}
                  />
                ))}
                <span className="ml-1 min-w-[75px] text-right text-[8px] font-semibold uppercase tracking-[0.15em] text-[#172019]/45">
                  {strength === 0
                    ? "8+ caracteres"
                    : strength === 1
                      ? "continue"
                      : strength === 2
                        ? "boa base"
                        : "mais longa"}
                </span>
              </div>

              <PasswordField
                id="confirm-password"
                label="Confirmar senha"
                value={confirm}
                onChange={setConfirm}
                visible={showConfirm}
                onToggle={() => setShowConfirm((current) => !current)}
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
                autoComplete="new-password"
              />

              <div
                id="reset-feedback"
                aria-live="polite"
                aria-atomic="true"
                className={error || done ? "min-h-10" : "sr-only"}
              >
                {error && (
                  <p
                    role="alert"
                    className="border-l-2 border-[#c33d2e] bg-[#c33d2e]/8 px-3 py-2.5 text-xs leading-5 text-[#9f2f24]"
                  >
                    {error}
                  </p>
                )}
                {done && (
                  <p className="flex items-center gap-2 border-l-2 border-[#58735b] bg-[#58735b]/8 px-3 py-2.5 text-xs leading-5 text-[#36523b]">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Senha atualizada. Abrindo
                    seu estúdio…
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || done}
                className="auth-submit group mt-1 flex min-h-14 w-full items-stretch bg-[#172019] text-left text-[#fbf8f1] transition-[transform,background-color] hover:bg-[#243129] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38] focus-visible:ring-offset-4 focus-visible:ring-offset-[#fbf8f1]"
              >
                <span className="flex flex-1 items-center px-5 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {loading ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />{" "}
                      Salvando…
                    </>
                  ) : done ? (
                    "Senha atualizada"
                  ) : (
                    "Salvar nova senha"
                  )}
                </span>
                <span
                  className="grid w-14 place-items-center bg-[#e45e38] text-white transition-transform group-hover:-translate-x-0.5"
                  aria-hidden="true"
                >
                  {done ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </span>
              </button>
            </form>

            <p className="mt-6 border-t border-[#172019]/15 pt-5 text-xs leading-5 text-[#172019]/55">
              O link de recuperação só pode ser usado uma vez. Se ele expirou, solicite outro na
              tela de acesso.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  onFocus,
  onBlur,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onBlur: () => void;
  autoComplete: string;
}) {
  return (
    <div className="auth-field group border border-[#172019]/22 bg-[#fbf8f1] px-4 py-3 transition-[border-color,transform,box-shadow] focus-within:-translate-y-px focus-within:border-[#e45e38] focus-within:shadow-[4px_4px_0_rgba(228,94,56,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#172019]/55 group-focus-within:text-[#b94127]"
        >
          {label}
          <span className="ml-1 text-[#e45e38]" aria-hidden="true">
            *
          </span>
        </label>
        <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#172019]/35">
          protegido
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <LockKeyhole
          className="h-4 w-4 shrink-0 text-[#172019]/40 transition-colors group-focus-within:text-[#e45e38]"
          strokeWidth={1.6}
          aria-hidden="true"
        />
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Mínimo de 8 caracteres"
          autoComplete={autoComplete}
          required
          aria-required="true"
          className="min-w-0 flex-1 bg-transparent py-1 text-[15px] text-[#172019] outline-none placeholder:text-[#172019]/32"
        />
        <button
          type="button"
          onClick={onToggle}
          className="grid h-9 w-9 shrink-0 place-items-center text-[#172019]/50 transition-colors hover:text-[#172019] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e45e38]"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
