import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Sparkles, Lock } from "lucide-react";
import { updatePassword } from "@/hooks/use-auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — AuraFit Studio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/auth" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
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
          <h1 className="font-display text-[24px] font-semibold tracking-[-0.03em]">Nova senha</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">Defina uma senha para continuar.</p>
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
            <PwField value={password} onChange={setPassword} label="Nova senha" />
            <PwField value={confirm} onChange={setConfirm} label="Confirmar senha" />
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            {done && <p className="text-[12px] text-emerald-300">Senha atualizada.</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-brand py-3 text-[13px] font-medium text-white transition-transform active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

function PwField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <label className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.7} />
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
