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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--ink)]">
      <div className="w-full max-w-md bg-white rounded-lg overflow-hidden shadow-xl">
        <div className="bg-[var(--yellow)] px-6 py-8 text-center">
          <div className="font-display text-5xl font-black text-black tracking-tight">FICHA<br/>DE TREINO</div>
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setMode("login")} className={`flex-1 py-2 text-sm font-bold uppercase ${mode==="login"?"bg-black text-white":"bg-gray-100"}`}>Entrar</button>
            <button onClick={() => setMode("signup")} className={`flex-1 py-2 text-sm font-bold uppercase ${mode==="signup"?"bg-black text-white":"bg-gray-100"}`}>Criar conta</button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div><Label>Nome</Label><Input value={nome} onChange={e=>setNome(e.target.value)} required maxLength={80}/></div>
            )}
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
            <div><Label>Senha</Label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}/></div>
            <Button type="submit" disabled={loading} className="w-full bg-black hover:bg-black/90 text-white font-bold uppercase">
              {loading ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-2 text-xs text-gray-400 uppercase">
            <div className="flex-1 h-px bg-gray-200"/> ou <div className="flex-1 h-px bg-gray-200"/>
          </div>
          <Button onClick={google} disabled={loading} variant="outline" className="w-full font-bold uppercase">
            Continuar com Google
          </Button>
        </div>
      </div>
    </div>
  );
}
