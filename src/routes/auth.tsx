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
    if (c) { setConvite(c.toUpperCase()); setMode("signup"); }
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
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { name: nome, invite_code: convite || undefined } },
        });
        if (error) throw error;
        toast.success("Conta criada! Confirme o e-mail se solicitado.");
      } else {

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setLoading(false); }
  };

  const google = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) toast.error(result.error.message || "Erro no Google");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-zinc-950 selection:bg-[var(--yellow)] selection:text-black">
      <div className="w-full max-w-[440px] bg-zinc-900 border-4 border-black shadow-[12px_12px_0px_0px_var(--yellow)] overflow-hidden">
        <div className="bg-black p-6 border-b-4 border-[var(--yellow)]">
          <h1 className="text-4xl sm:text-5xl text-[var(--yellow)] text-center italic tracking-tighter uppercase font-bold leading-none" style={{ fontFamily: "'Anton', sans-serif" }}>
            FICHA DE TREINO
          </h1>
        </div>

        <div className="p-8 space-y-7">
          <div className="flex border-4 border-black bg-black">
            <button type="button" onClick={() => setMode("login")} className={`flex-1 py-3 text-lg font-bold uppercase tracking-widest transition-colors ${mode==="login" ? "bg-[var(--yellow)] text-black" : "text-zinc-500 hover:text-white"}`} style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
              Entrar
            </button>
            <button type="button" onClick={() => setMode("signup")} className={`flex-1 py-3 text-lg font-bold uppercase tracking-widest transition-colors ${mode==="signup" ? "bg-[var(--yellow)] text-black" : "text-zinc-500 hover:text-white"}`} style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
              Criar Conta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest pl-1">Nome</label>
                <input value={nome} onChange={e=>setNome(e.target.value)} required maxLength={80}
                  className="w-full bg-black border-2 border-zinc-800 focus:border-[var(--yellow)] text-white p-4 font-bold outline-none transition-all placeholder:text-zinc-700"
                  style={{ fontFamily: "'Roboto Condensed', sans-serif" }}/>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest pl-1">E-mail</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="seu@email.com"
                className="w-full bg-black border-2 border-zinc-800 focus:border-[var(--yellow)] text-white p-4 font-bold outline-none transition-all placeholder:text-zinc-700"
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}/>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest pl-1">Senha</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} placeholder="********"
                className="w-full bg-black border-2 border-zinc-800 focus:border-[var(--yellow)] text-white p-4 font-bold outline-none transition-all placeholder:text-zinc-700"
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}/>
            </div>
            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest pl-1">Código de convite <span className="text-zinc-600 normal-case tracking-normal">(opcional)</span></label>
                <input value={convite} onChange={e=>setConvite(e.target.value.toUpperCase())} placeholder="Deixe em branco para entrar como aluno" maxLength={12}
                  className="w-full bg-black border-2 border-zinc-800 focus:border-[var(--yellow)] text-white p-4 font-bold outline-none transition-all placeholder:text-zinc-700"
                  style={{ fontFamily: "'Roboto Condensed', sans-serif" }}/>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-[var(--yellow)] text-black py-5 text-xl font-black uppercase tracking-tighter shadow-[6px_6px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-60"
              style={{ fontFamily: "'Anton', sans-serif" }}>
              {loading ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t-2 border-zinc-800"></div>
            <span className="flex-shrink mx-4 text-zinc-500 font-black text-sm uppercase tracking-widest">OU</span>
            <div className="flex-grow border-t-2 border-zinc-800"></div>
          </div>

          <button onClick={google} disabled={loading}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-4 font-bold flex items-center justify-center gap-3 transition-colors border-2 border-black uppercase tracking-wider disabled:opacity-60"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>
        </div>

        <div className="h-2 w-full bg-[var(--yellow)]"></div>
      </div>
    </div>
  );
}
