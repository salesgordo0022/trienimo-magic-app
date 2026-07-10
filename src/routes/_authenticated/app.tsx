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
import { Plus, LogOut, Trash2, Play, Pencil, History, Download, Shield, Users, User, Dumbbell, ChevronRight, TrendingUp, Calendar, Flame } from "lucide-react";

const workoutsQO = () => queryOptions({ queryKey: ["workouts"], queryFn: () => listWorkouts() });
const assignedQO = () => queryOptions({ queryKey: ["assigned"], queryFn: () => listAssignedToMe() });
const profileQO = () => queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });
const studentsQO = () => queryOptions({ queryKey: ["myStudents"], queryFn: () => listMyStudents() });

export const Route = createFileRoute("/_authenticated/app")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(workoutsQO());
    context.queryClient.ensureQueryData(assignedQO());
    context.queryClient.ensureQueryData(profileQO());
    context.queryClient.ensureQueryData(roleQO());
    context.queryClient.ensureQueryData(studentsQO());
  },
  component: Dashboard,
});

const pageBg = "radial-gradient(1200px 600px at 15% 10%, rgba(204,255,0,0.08), transparent 60%), radial-gradient(900px 500px at 90% 90%, rgba(204,255,0,0.05), transparent 60%), #0a0a0a";
const glassCard = "rounded-2xl border border-white/10 backdrop-blur-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]";
const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-zinc-600 focus:border-[var(--lime)]/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-[var(--lime)]/10";
const limeBtn = "inline-flex items-center justify-center gap-2 text-black font-bold rounded-xl px-4 py-2.5 text-sm transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60";
const limeBtnStyle = { background: "linear-gradient(135deg, #CCFF00, #B8E600)", boxShadow: "0 10px 30px -12px rgba(204,255,0,0.55)" } as const;
const chipBtn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all";
// Aliases (compatibilidade com o restante do arquivo)
const goldBtn = limeBtn;
const goldBtnStyle = limeBtnStyle;

function Dashboard() {
  const { data: workouts } = useSuspenseQuery(workoutsQO());
  const { data: assigned } = useSuspenseQuery(assignedQO());
  const { data: profile } = useSuspenseQuery(profileQO());
  const { data: myRole } = useSuspenseQuery(roleQO());
  const { data: myStudents } = useSuspenseQuery(studentsQO());
  const isTeacher = myRole.role === "admin" || myRole.role === "professor";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [letra, setLetra] = useState("");
  const [assignTo, setAssignTo] = useState<string>("");
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
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/40 border-b border-white/5 safe-top safe-x">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #FFD400, #FFB800)", boxShadow: "0 10px 30px -8px rgba(255,212,0,0.5)" }}>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M4 9v6"/><path d="M20 9v6"/><path d="M2 11v2"/><path d="M22 11v2"/></svg>
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm sm:text-base tracking-tight leading-none truncate">Ficha de Treino</div>
              <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 truncate">{profile.personal_nome ?? "SEU NOME - PERSONAL TRAINER"}</div>
            </div>
          </div>
          <div className="flex gap-1 items-center shrink-0">
            {myRole.role === "admin" && (
              <Link to="/admin" aria-label="Admin" className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"><Shield className="w-4 h-4"/></Link>
            )}
            {(myRole.role === "admin" || myRole.role === "professor") && (
              <Link to="/professor" aria-label="Alunos" className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"><Users className="w-4 h-4"/></Link>
            )}
            <button onClick={() => setShowInstall(true)} aria-label="Instalar" className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"><Download className="w-4 h-4"/></button>
            <button onClick={() => setShowProfile(true)} aria-label="Perfil" className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"><User className="w-4 h-4"/></button>
            <button onClick={logout} aria-label="Sair" className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"><LogOut className="w-4 h-4"/></button>
          </div>
        </div>
      </header>


      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Hero — saudação + treino de hoje */}
        <section className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <div className={`${glassCard} p-5 sm:p-6 flex flex-col justify-between min-h-[180px] relative overflow-hidden`}>
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, #CCFF00, transparent 70%)" }}/>
            <div>
              <div className="text-xs uppercase tracking-widest text-[var(--lime)] font-bold">Olá, {(profile.nome ?? "Atleta").split(" ")[0]} 👋</div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white leading-tight">Bora treinar hoje?</h1>
              <p className="text-sm text-zinc-400 mt-1">Seu treino está pronto na plataforma.</p>
            </div>
            {(assigned[0] || workouts[0]) && (
              <Link
                to="/ficha/$id"
                params={{ id: (assigned[0] ?? workouts[0]).id }}
                className="mt-5 group inline-flex items-center gap-4 rounded-2xl px-4 py-3 text-black font-bold transition-all hover:brightness-110 active:scale-[0.99] self-start"
                style={limeBtnStyle}
              >
                <span className="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
                  <Dumbbell className="w-5 h-5 text-[var(--lime)]"/>
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-base font-black uppercase tracking-wide">Meu Treino</span>
                  <span className="block text-xs font-semibold opacity-80">Acessar treino {(assigned[0] ?? workouts[0]).letra}</span>
                </span>
                <ChevronRight className="w-5 h-5 ml-2 shrink-0 transition-transform group-hover:translate-x-1"/>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatChip icon={<TrendingUp className="w-4 h-4"/>} label="Progresso" value={`${Math.min(99, workouts.length * 15 + 10)}%`} sub="do objetivo"/>
            <StatChip icon={<Calendar className="w-4 h-4"/>} label="Próximo treino" value="Hoje" sub={new Date().toLocaleDateString("pt-BR",{weekday:"short"})}/>
            <StatChip icon={<Flame className="w-4 h-4"/>} label="Sequência" value={String(Math.max(1, workouts.length))} sub="dias"/>
          </div>
        </section>


        <section className={`${glassCard} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #FFD400, #FFB800)" }} />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Novo Treino</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (!letra) return; create.mutate({ data: { letra, assigned_to: assignTo || null } }); setLetra(""); }} className="flex flex-wrap gap-2">
            <input placeholder="Letra (A, B, C...)" value={letra} onChange={e=>setLetra(e.target.value.slice(0,3))} className={`${inputCls} uppercase max-w-[140px]`}/>
            {isTeacher && (
              <select value={assignTo} onChange={e=>setAssignTo(e.target.value)} className={`${inputCls} max-w-[260px]`}>
                <option value="">Para mim (pessoal)</option>
                {myStudents.map(s => (
                  <option key={s.id} value={s.id}>Aluno: {s.nome ?? "(sem nome)"}</option>
                ))}
              </select>
            )}
            <button type="submit" disabled={create.isPending} className={goldBtn} style={goldBtnStyle}>
              <Plus className="w-4 h-4"/>Criar
            </button>
          </form>
          {isTeacher && myStudents.length === 0 && (
            <div className="text-[11px] text-zinc-500 mt-3">Sem alunos vinculados ainda — peça ao admin para atribuir alunos a você.</div>
          )}
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
                    {w.assigned_nome ? (
                      <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-black rounded-full px-2 py-0.5" style={{ background: "linear-gradient(135deg, #FFD400, #FFB800)" }}>
                        <Users className="w-3 h-3"/> {w.assigned_nome}
                      </div>
                    ) : isTeacher ? (
                      <div className="text-[11px] text-zinc-500 mt-0.5">Pessoal</div>
                    ) : null}
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
                      <Link to="/ficha/$id" params={{ id: w.id }} className={chipBtn} style={goldBtnStyle}><Pencil className="w-3 h-3"/>Abrir ficha</Link>
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
