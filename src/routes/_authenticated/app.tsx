import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWorkouts, listAssignedToMe, createWorkout, deleteWorkout } from "@/lib/workouts.functions";
import { getMyRole, listMyStudents } from "@/lib/roles.functions";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Pencil, History, Dumbbell, ChevronRight, TrendingUp, Calendar, Flame, Users, BookOpen } from "lucide-react";

const workoutsQO = () => queryOptions({ queryKey: ["workouts"], queryFn: () => listWorkouts() });
const assignedQO = () => queryOptions({ queryKey: ["assigned"], queryFn: () => listAssignedToMe() });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });
const studentsQO = () => queryOptions({ queryKey: ["myStudents"], queryFn: () => listMyStudents() });

export const Route = createFileRoute("/_authenticated/app")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(workoutsQO());
    context.queryClient.ensureQueryData(assignedQO());
    context.queryClient.ensureQueryData(roleQO());
    context.queryClient.ensureQueryData(studentsQO());
  },
  component: Inicio,
});

function Inicio() {
  const { data: workouts } = useSuspenseQuery(workoutsQO());
  const { data: assigned } = useSuspenseQuery(assignedQO());
  const { data: myRole } = useSuspenseQuery(roleQO());
  const { data: myStudents } = useSuspenseQuery(studentsQO());
  const isTeacher = myRole.role === "admin" || myRole.role === "professor";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [letra, setLetra] = useState("");
  const [assignTo, setAssignTo] = useState("");

  const primary = assigned[0] ?? workouts[0];

  const create = useMutation({
    mutationFn: useServerFn(createWorkout),
    onSuccess: (r: { id: string }) => { qc.invalidateQueries({ queryKey: ["workouts"] }); navigate({ to: "/ficha/$id", params: { id: r.id } }); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteWorkout),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts"] }),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Hero — Meu Treino */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--lime)]/30 bg-gradient-to-br from-[var(--lime)] to-[#a8d400] p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-black/10 blur-3xl"/>
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-2xl">
            <Dumbbell className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--lime)]"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-black/70">Treino de hoje</div>
            <h2 className="text-2xl sm:text-3xl font-black text-black leading-tight mt-1">Meu Treino</h2>
            <p className="text-sm text-black/70 mt-1">
              {primary ? `Acessar treino ${primary.letra}${primary.nome ? " — " + primary.nome : ""}` : "Nenhum treino disponível ainda."}
            </p>
          </div>
          {primary && (
            <Link
              to="/ficha/$id"
              params={{ id: primary.id }}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-black text-[var(--lime)] px-5 py-3 font-bold text-sm hover:bg-zinc-900 transition-all"
            >
              Acessar <ChevronRight className="w-4 h-4"/>
            </Link>
          )}
        </div>
      </section>

      {/* Stats chips */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatChip icon={<TrendingUp className="w-5 h-5"/>} label="Progresso" value={`${Math.min(99, workouts.length * 15 + 10)}%`} sub="do objetivo"/>
        <StatChip icon={<Calendar className="w-5 h-5"/>} label="Próximo treino" value="Hoje" sub={new Date().toLocaleDateString("pt-BR",{weekday:"long"})}/>
        <StatChip icon={<Flame className="w-5 h-5"/>} label="Sequência" value={String(Math.max(1, workouts.length))} sub="dias"/>
      </section>

      {/* Biblioteca CTA */}
      <Link to="/biblioteca" className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#111112] to-[#161618] p-4 hover:border-[var(--lime)]/40 transition-all">
        <div className="w-12 h-12 rounded-2xl bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center shrink-0">
          <BookOpen className="w-6 h-6"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black">Biblioteca de Exercícios</div>
          <div className="text-xs text-zinc-500">Explore +1.300 exercícios com animação, músculos e equipamentos</div>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-[var(--lime)] transition-colors"/>
      </Link>

      {/* Criar novo treino */}
      <section className="rounded-2xl border border-white/10 bg-[#111112] p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-[var(--lime)]"/>
          <h3 className="text-sm font-black uppercase tracking-wide">Novo Treino</h3>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!letra) return; create.mutate({ data: { letra, assigned_to: assignTo || null } }); setLetra(""); }}
          className="flex flex-wrap gap-2"
        >
          <input
            placeholder="Letra (A, B, C...)"
            value={letra}
            onChange={e=>setLetra(e.target.value.slice(0,3))}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm uppercase max-w-[140px] outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20"
          />
          {isTeacher && (
            <select value={assignTo} onChange={e=>setAssignTo(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm max-w-[260px] outline-none focus:border-[var(--lime)]/60">
              <option value="">Para mim (pessoal)</option>
              {myStudents.map(s => <option key={s.id} value={s.id}>Aluno: {s.nome ?? "(sem nome)"}</option>)}
            </select>
          )}
          <button type="submit" disabled={create.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] text-black px-5 py-2.5 font-bold text-sm hover:brightness-110 disabled:opacity-60">
            <Plus className="w-4 h-4"/>Criar
          </button>
        </form>
      </section>

      {/* Lista de fichas */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-1 h-5 rounded-full bg-[var(--lime)]"/>
          <h3 className="text-sm font-black uppercase tracking-wide">Minhas Fichas</h3>
        </div>
        {workouts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#111112] p-10 text-center text-sm text-zinc-500">
            Nenhuma ficha ainda. Crie o Treino A acima.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {workouts.map(w => (
              <div key={w.id} className="rounded-2xl border border-white/10 bg-[#111112] flex overflow-hidden hover:border-[var(--lime)]/40 transition-all">
                <Link to="/ficha/$id" params={{ id: w.id }} className="w-20 sm:w-24 bg-[var(--lime)] text-black font-black text-4xl sm:text-5xl flex items-center justify-center">
                  {w.letra}
                </Link>
                <div className="flex-1 p-4 min-w-0">
                  <div className="font-bold text-sm">Treino {w.letra}</div>
                  {w.assigned_nome ? (
                    <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-black rounded-full px-2 py-0.5 bg-[var(--lime)]">
                      <Users className="w-3 h-3"/> {w.assigned_nome}
                    </div>
                  ) : isTeacher ? (
                    <div className="text-[11px] text-zinc-500 mt-0.5">Pessoal</div>
                  ) : null}
                  {w.nome && <div className="text-xs text-zinc-500 mt-0.5 truncate">{w.nome}</div>}
                  <div className="flex gap-1.5 mt-3 flex-wrap items-center">
                    <Link to="/ficha/$id" params={{ id: w.id }} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--lime)] text-black px-3 py-1.5 text-xs font-bold">
                      <Pencil className="w-3 h-3"/>Abrir
                    </Link>
                    <Link to="/ficha/$id/historico" params={{ id: w.id }} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
                      <History className="w-3 h-3"/>Histórico
                    </Link>
                    <button onClick={() => { if (confirm("Excluir esta ficha?")) del.mutate({ data: { id: w.id } }); }} className="ml-auto p-1.5 rounded-lg text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {assigned.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="w-1 h-5 rounded-full bg-[var(--lime)]"/>
            <h3 className="text-sm font-black uppercase tracking-wide">Fichas do seu Professor</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {assigned.map(w => (
              <div key={w.id} className="rounded-2xl border border-[var(--lime)]/30 bg-[#111112] flex overflow-hidden">
                <Link to="/ficha/$id" params={{ id: w.id }} className="w-20 sm:w-24 bg-black text-[var(--lime)] font-black text-4xl sm:text-5xl flex items-center justify-center border-r border-[var(--lime)]/20">
                  {w.letra}
                </Link>
                <div className="flex-1 p-4 min-w-0">
                  <div className="font-bold text-sm">Treino {w.letra}</div>
                  {w.nome && <div className="text-xs text-zinc-500 mt-0.5 truncate">{w.nome}</div>}
                  {w.assigned_nome && <div className="text-[11px] text-zinc-600 mt-1">Prof: {w.assigned_nome}</div>}
                  <div className="flex gap-1.5 mt-3">
                    <Link to="/ficha/$id" params={{ id: w.id }} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--lime)] text-black px-3 py-1.5 text-xs font-bold">
                      <Pencil className="w-3 h-3"/>Abrir ficha
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatChip({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111112] p-3 sm:p-4 flex flex-col items-center justify-center text-center">
      <div className="w-9 h-9 rounded-full bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center mb-2">{icon}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 leading-tight">{label}</div>
      <div className="text-xl sm:text-2xl font-black text-white leading-tight mt-0.5">{value}</div>
      <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>
    </div>
  );
}
