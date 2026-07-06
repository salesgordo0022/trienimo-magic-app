import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { listWorkouts, listAssignedToMe, createWorkout, deleteWorkout, getProfile, updateProfile } from "@/lib/workouts.functions";
import { getMyRole, listMyStudents } from "@/lib/roles.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, LogOut, Trash2, Play, Pencil, History, Download, Shield, Users } from "lucide-react";

const workoutsQO = () => queryOptions({ queryKey: ["workouts"], queryFn: () => listWorkouts() });
const assignedQO = () => queryOptions({ queryKey: ["assigned"], queryFn: () => listAssignedToMe() });
const profileQO = () => queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });

export const Route = createFileRoute("/_authenticated/app")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(workoutsQO());
    context.queryClient.ensureQueryData(assignedQO());
    context.queryClient.ensureQueryData(profileQO());
    context.queryClient.ensureQueryData(roleQO());
  },
  component: Dashboard,
});

const pageBg = "radial-gradient(1200px 600px at 15% 10%, rgba(255,212,0,0.08), transparent 60%), radial-gradient(900px 500px at 90% 90%, rgba(255,212,0,0.05), transparent 60%), #0b0b0d";
const glassCard = "rounded-2xl border border-white/10 backdrop-blur-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]";
const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-zinc-600 focus:border-[var(--yellow)]/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-[var(--yellow)]/10";
const goldBtn = "inline-flex items-center justify-center gap-2 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60";
const goldBtnStyle = { background: "linear-gradient(135deg, #FFD400, #FFB800)", boxShadow: "0 10px 30px -12px rgba(255,212,0,0.55)" } as const;
const chipBtn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all";

function Dashboard() {
  const { data: workouts } = useSuspenseQuery(workoutsQO());
  const { data: assigned } = useSuspenseQuery(assignedQO());
  const { data: profile } = useSuspenseQuery(profileQO());
  const { data: myRole } = useSuspenseQuery(roleQO());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [letra, setLetra] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  const create = useMutation({
    mutationFn: useServerFn(createWorkout),
    onSuccess: (r: { id: string }) => { qc.invalidateQueries({ queryKey: ["workouts"] }); navigate({ to: "/ficha/$id", params: { id: r.id } }); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteWorkout),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts"] }),
  });

  const logout = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen text-white" style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif", background: pageBg }}>
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/40 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FFD400, #FFB800)", boxShadow: "0 10px 30px -8px rgba(255,212,0,0.5)" }}>
              <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M4 9v6"/><path d="M20 9v6"/><path d="M2 11v2"/><path d="M22 11v2"/></svg>
            </div>
            <div>
              <div className="text-white font-bold text-base tracking-tight leading-none">Ficha de Treino</div>
              <div className="text-[11px] text-zinc-500 mt-1">{profile.personal_nome ?? "SEU NOME - PERSONAL TRAINER"}</div>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end items-center">
            {myRole.role === "admin" && (
              <Link to="/admin" className={`${chipBtn} bg-white/5 hover:bg-white/10 border border-white/10 text-white`}><Shield className="w-3.5 h-3.5"/>Admin</Link>
            )}
            {(myRole.role === "admin" || myRole.role === "professor") && (
              <Link to="/professor" className={`${chipBtn} bg-white/5 hover:bg-white/10 border border-white/10 text-white`}><Users className="w-3.5 h-3.5"/>Alunos</Link>
            )}
            <button onClick={() => setShowInstall(true)} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"><Download className="w-4 h-4"/></button>
            <button onClick={() => setShowProfile(true)} className="px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors">Perfil</button>
            <button onClick={logout} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"><LogOut className="w-4 h-4"/></button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <section className={`${glassCard} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #FFD400, #FFB800)" }} />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Novo Treino</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (!letra) return; create.mutate({ data: { letra } }); setLetra(""); }} className="flex gap-2">
            <input placeholder="Letra (A, B, C...)" value={letra} onChange={e=>setLetra(e.target.value.slice(0,3))} className={`${inputCls} uppercase max-w-[180px]`}/>
            <button type="submit" disabled={create.isPending} className={goldBtn} style={goldBtnStyle}>
              <Plus className="w-4 h-4"/>Criar
            </button>
          </form>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #FFD400, #FFB800)" }} />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Minhas Fichas</h2>
          </div>
          {workouts.length === 0 ? (
            <div className={`${glassCard} p-10 text-center text-sm text-zinc-500`}>
              Nenhuma ficha ainda. Crie o Treino A acima.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {workouts.map(w => (
                <div key={w.id} className={`${glassCard} flex overflow-hidden group hover:border-white/20 transition-all`}>
                  <Link to="/ficha/$id" params={{ id: w.id }} className="relative flex items-center justify-center w-24 font-bold text-5xl text-black" style={{ background: "linear-gradient(135deg, #FFD400, #FFB800)" }}>
                    <span className="drop-shadow-sm">{w.letra}</span>
                  </Link>
                  <div className="flex-1 p-4">
                    <div className="font-semibold text-white text-sm">Treino {w.letra}</div>
                    {w.nome && <div className="text-xs text-zinc-500 mt-0.5">{w.nome}</div>}
                    {w.data_inicio && <div className="text-[11px] text-zinc-600 mt-1">Início: {new Date(w.data_inicio).toLocaleDateString("pt-BR")}</div>}
                    <div className="flex gap-1.5 mt-3 flex-wrap items-center">
                      <Link to="/ficha/$id/executar" params={{ id: w.id }} className={chipBtn} style={goldBtnStyle}><Play className="w-3 h-3"/>Executar</Link>
                      <Link to="/ficha/$id" params={{ id: w.id }} className={`${chipBtn} bg-white/5 hover:bg-white/10 border border-white/10 text-white`}><Pencil className="w-3 h-3"/>Editar</Link>
                      <Link to="/ficha/$id/historico" params={{ id: w.id }} className={`${chipBtn} bg-white/5 hover:bg-white/10 border border-white/10 text-white`}><History className="w-3 h-3"/>Histórico</Link>
                      <button onClick={() => { if (confirm("Excluir esta ficha?")) del.mutate({ data: { id: w.id } }); }} className="ml-auto p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {assigned.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #FFD400, #FFB800)" }} />
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Fichas do seu Professor</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {assigned.map(w => (
                <div key={w.id} className={`${glassCard} flex overflow-hidden`} style={{ borderColor: "rgba(255,212,0,0.35)" }}>
                  <Link to="/ficha/$id" params={{ id: w.id }} className="flex items-center justify-center w-24 font-bold text-5xl text-[var(--yellow)] bg-black/40">
                    {w.letra}
                  </Link>
                  <div className="flex-1 p-4">
                    <div className="font-semibold text-white text-sm">Treino {w.letra}</div>
                    {w.nome && <div className="text-xs text-zinc-500 mt-0.5">{w.nome}</div>}
                    {w.assigned_nome && <div className="text-[11px] text-zinc-600 mt-1">Prof: {w.assigned_nome}</div>}
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      <Link to="/ficha/$id/executar" params={{ id: w.id }} className={chipBtn} style={goldBtnStyle}><Play className="w-3 h-3"/>Executar</Link>
                      <Link to="/ficha/$id/historico" params={{ id: w.id }} className={`${chipBtn} bg-white/5 hover:bg-white/10 border border-white/10 text-white`}><History className="w-3 h-3"/>Histórico</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {showProfile && <ProfileDialog profile={profile} onClose={() => setShowProfile(false)}/>}
      {showInstall && <InstallDialog onClose={() => setShowInstall(false)}/>}
    </div>
  );
}

function ProfileDialog({ profile, onClose }: { profile: Awaited<ReturnType<typeof getProfile>>; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: profile.nome ?? "", objetivo: profile.objetivo ?? "",
    dias_semana: profile.dias_semana ?? "", observacao: profile.observacao ?? "",
    logo_texto: profile.logo_texto ?? "SuaLogo", personal_nome: profile.personal_nome ?? "",
  });
  const save = useMutation({
    mutationFn: useServerFn(updateProfile),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Salvo"); onClose(); },
  });
  const field = (label: string, key: keyof typeof form) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400 pl-1">{label}</label>
      <input value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className={inputCls}/>
    </div>
  );
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose} style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <div className={`${glassCard} w-full max-w-md bg-zinc-950/90 text-white`} onClick={e=>e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 border-b border-white/5">
          <h3 className="text-lg font-bold tracking-tight">Perfil</h3>
        </div>
        <form className="p-5 space-y-3" onSubmit={(e)=>{e.preventDefault();save.mutate({data:form});}}>
          {field("Aluno", "nome")}
          {field("Objetivo", "objetivo")}
          {field("Dias da Semana", "dias_semana")}
          {field("Observação", "observacao")}
          {field("Logo (texto)", "logo_texto")}
          {field("Nome do Personal", "personal_nome")}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white py-2.5 text-sm font-medium transition-colors">Cancelar</button>
            <button type="submit" className={`flex-1 ${goldBtn}`} style={goldBtnStyle}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InstallDialog({ onClose }: { onClose: () => void }) {
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose} style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <div className={`${glassCard} w-full max-w-md bg-zinc-950/90 text-white`} onClick={e=>e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 border-b border-white/5">
          <h3 className="text-lg font-bold tracking-tight">Instalar App</h3>
        </div>
        <div className="p-5 text-sm space-y-3 text-zinc-300">
          {isIOS ? (
            <>
              <p className="font-semibold text-white">iPhone / iPad</p>
              <ol className="list-decimal ml-5 space-y-1 text-zinc-400">
                <li>Toque no ícone <b className="text-white">Compartilhar</b> na barra do Safari</li>
                <li>Escolha <b className="text-white">"Adicionar à Tela de Início"</b></li>
                <li>Toque em <b className="text-white">Adicionar</b></li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-semibold text-white">PC (Chrome / Edge)</p>
              <ol className="list-decimal ml-5 space-y-1 text-zinc-400">
                <li>Clique no ícone <b className="text-white">Instalar</b> na barra de endereço</li>
                <li>Ou menu ⋮ → <b className="text-white">Instalar Ficha de Treino…</b></li>
              </ol>
              <p className="pt-2 text-zinc-400"><b className="text-white">Android:</b> menu ⋮ → <b className="text-white">Instalar app</b>.</p>
            </>
          )}
          <button onClick={onClose} className={`w-full ${goldBtn} mt-2`} style={goldBtnStyle}>Ok</button>
        </div>
      </div>
    </div>
  );
}
