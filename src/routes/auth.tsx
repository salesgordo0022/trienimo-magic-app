import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [convite, setConvite] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const c = url.searchParams.get("convite");
    if (c) {
      setConvite(c.toUpperCase());
      setMode("signup");
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/app" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: nome, invite_code: convite || undefined },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Confirme o e-mail se solicitado.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) toast.error(result.error.message || "Erro no Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 relative overflow-hidden"
      style={{
        fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
        background:
          "radial-gradient(1200px 600px at 15% 10%, rgba(255,212,0,0.10), transparent 60%), radial-gradient(900px 500px at 90% 90%, rgba(255,212,0,0.06), transparent 60%), #0b0b0d",
      }}
    >
      <div
        className="w-full max-w-[420px] rounded-3xl overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        }}
      >
        <div className="px-8 pt-10 pb-6 text-center">
          <img
            src="/imperial-fitness-logo.png"
            alt="Imperial Fitness"
            className="mx-auto h-20 w-auto object-contain mb-4 drop-shadow-[0_0_20px_rgba(204,255,0,0.35)]"
          />
          <h1 className="text-2xl font-bold text-white tracking-tight">Ficha de Treino</h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </p>
        </div>

        <div className="px-8 pb-8 space-y-5">
          <div className="flex p-1 rounded-full bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${mode === "login" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${mode === "signup" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"}`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 pl-1">Nome</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="Seu nome"
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-3 text-sm outline-none transition-all placeholder:text-zinc-600 focus:border-[var(--yellow)]/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-[var(--yellow)]/10"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 pl-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-3 text-sm outline-none transition-all placeholder:text-zinc-600 focus:border-[var(--yellow)]/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-[var(--yellow)]/10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 pl-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-3 text-sm outline-none transition-all placeholder:text-zinc-600 focus:border-[var(--yellow)]/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-[var(--yellow)]/10"
              />
            </div>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 pl-1">
                  Código de convite <span className="text-zinc-600">(opcional)</span>
                </label>
                <input
                  value={convite}
                  onChange={(e) => setConvite(e.target.value.toUpperCase())}
                  placeholder="Deixe em branco para entrar como aluno"
                  maxLength={12}
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-3 text-sm outline-none transition-all placeholder:text-zinc-600 focus:border-[var(--yellow)]/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-[var(--yellow)]/10"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-black font-semibold rounded-xl py-3.5 text-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60 mt-2"
              style={{
                background: "linear-gradient(135deg, #CCFF00, #A8D400)",
                boxShadow: "0 10px 30px -10px rgba(204,255,0,0.55)",
              }}
            >
              {loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="mx-3 text-zinc-500 text-xs">ou continue com</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button
            onClick={google}
            disabled={loading}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-3 transition-all text-sm disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"
              />
            </svg>
            Continuar com Google
          </button>
        </div>
      </div>
    </div>
  );
}
