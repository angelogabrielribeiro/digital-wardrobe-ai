import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, Mail, Lock, Store as StoreIcon } from "lucide-react";
import {
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  useAuth,
} from "@/hooks/use-auth";

type Mode = "login" | "signup" | "reset";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — AuraFit Studio" },
      { name: "description", content: "Acesse o AuraFit Studio para gerenciar seus produtos e QR Codes." },
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && session) navigate({ to: "/studio", replace: true });
  }, [session, authLoading, navigate]);

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

  const title =
    mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha";

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.7} /> Voltar
        </Link>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-brand" strokeWidth={1.7} />
          <span className="text-[13px] font-medium tracking-tight">AuraFit Studio</span>
        </div>
        <span className="w-[52px]" />
      </header>

      <main className="flex flex-1 flex-col justify-center px-5 pb-10">
        <div className="glass rounded-3xl p-6">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Business</p>
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.03em]">{title}</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {mode === "login" && "Acesse seu painel."}
            {mode === "signup" && "Cadastre sua loja em segundos."}
            {mode === "reset" && "Enviaremos um link para redefinir sua senha."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
            {mode === "signup" && (
              <Field Icon={StoreIcon} label="Nome da loja" value={storeName} onChange={setStoreName} placeholder="Minha Loja" />
            )}
            <Field Icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="voce@loja.com" autoComplete="email" />
            {mode !== "reset" && (
              <Field
                Icon={Lock}
                label="Senha"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            )}

            {error && <p className="text-[12px] text-red-400">{error}</p>}
            {info && <p className="text-[12px] text-emerald-300">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-brand py-3 text-[13px] font-medium text-white transition-transform active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-[12px] text-muted-foreground">
            {mode !== "login" && (
              <button type="button" onClick={() => setMode("login")} className="hover:text-foreground">
                Já tenho conta — entrar
              </button>
            )}
            {mode !== "signup" && (
              <button type="button" onClick={() => setMode("signup")} className="hover:text-foreground">
                Novo por aqui? Criar conta
              </button>
            )}
            {mode !== "reset" && (
              <button type="button" onClick={() => setMode("reset")} className="hover:text-foreground">
                Esqueci minha senha
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  Icon: React.ElementType;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.7} />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
