import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWorkouts, listAssignedToMe, deleteWorkout, hasCompletedToday, listCompletedWorkoutIds } from "@/lib/workouts.functions";
import { getMyRole, listMyStudents } from "@/lib/roles.functions";
import { toast } from "sonner";
import { Trash2, Pencil, History, Dumbbell, ChevronRight, Calendar, Flame, Users, BookOpen, Flag, Apple, CalendarDays, Target } from "lucide-react";

const workoutsQO = () => queryOptions({ queryKey: ["workouts"], queryFn: () => listWorkouts() });
const assignedQO = () => queryOptions({ queryKey: ["assigned"], queryFn: () => listAssignedToMe() });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });
const studentsQO = () => queryOptions({ queryKey: ["myStudents"], queryFn: () => listMyStudents() });
const completedIdsQO = () => queryOptions({ queryKey: ["completedWorkoutIds"], queryFn: () => listCompletedWorkoutIds() });

export const Route = createFileRoute("/_authenticated/app")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(workoutsQO());
    context.queryClient.ensureQueryData(assignedQO());
    context.queryClient.ensureQueryData(roleQO());
    context.queryClient.ensureQueryData(studentsQO());
    context.queryClient.ensureQueryData(completedIdsQO());
  },
  component: Inicio,
});

function Inicio() {
  const { data: workouts } = useSuspenseQuery(workoutsQO());
  const { data: assigned } = useSuspenseQuery(assignedQO());
  const { data: myRole } = useSuspenseQuery(roleQO());
  const { data: myStudents } = useSuspenseQuery(studentsQO());
  const { data: completedIds } = useSuspenseQuery(completedIdsQO());
  const isTeacher = myRole.role === "admin" || myRole.role === "professor";

  const activeAssigned = assigned.filter(w => !completedIds.includes(w.id));

  const qc = useQueryClient();
  const navigate = useNavigate();

  const primary = activeAssigned[0];

  const { data: completedToday } = useQuery({
    queryKey: ["completedToday", primary?.id],
    queryFn: () => hasCompletedToday({ data: { workout_id: primary!.id } }),
    enabled: !!primary,
  });

  const del = useMutation({
    mutationFn: useServerFn(deleteWorkout),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts"] }),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Hero — Meu Treino */}
      <Link to="/meu-treino" className="block">
        <section className="relative overflow-hidden rounded-3xl border border-[var(--lime)]/30 bg-black p-6 sm:p-8 min-h-[200px] group hover:border-[var(--lime)]/50 transition-all">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--lime)] flex items-center justify-center shrink-0 shadow-2xl">
              {completedToday?.done ? <Flag className="w-8 h-8 sm:w-10 sm:h-10 text-black"/> : <Dumbbell className="w-8 h-8 sm:w-10 sm:h-10 text-black"/>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lime)]">Treino de hoje</div>
              {completedToday?.done ? (
                <>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mt-1">Treino Concluido!</h2>
                  <p className="text-sm text-zinc-400 mt-1">Voce ja completou seu treino de hoje. Amanha tem mais!</p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mt-1">Meu Treino</h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    {primary ? `Acessar treino ${primary.letra}${primary.nome ? " — " + primary.nome : ""}` : "Nenhum treino disponivel ainda."}
                  </p>
                </>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-[var(--lime)] transition-colors shrink-0" />
          </div>
        </section>
      </Link>

      {/* Stats chips */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111112] p-4">
          <img
            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#111112] to-[#111112]/80" />
          <div className="relative">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--lime)]/15 text-[var(--lime)] mb-2">
              <Calendar className="w-5 h-5"/>
            </div>
            <div className="text-xl font-black text-white">Hoje</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{new Date().toLocaleDateString("pt-BR",{weekday:"long"})}</div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111112] p-4">
          <img
            src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#111112] to-[#111112]/80" />
          <div className="relative">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--lime)]/15 text-[var(--lime)] mb-2">
              <Flame className="w-5 h-5"/>
            </div>
            <div className="text-xl font-black text-white">{Math.max(1, workouts.length)} dias</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Sequencia</div>
          </div>
        </div>
      </section>

      {/* Biblioteca CTA */}
      <Link to="/biblioteca" className="group relative overflow-hidden rounded-2xl border border-white/10 p-0 block">
        <img
          src="https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/90 to-transparent" />
        <div className="relative flex items-center gap-4 p-5">
          <div className="w-14 h-14 rounded-2xl bg-[var(--lime)] flex items-center justify-center shrink-0">
            <BookOpen className="w-7 h-7 text-black"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-white">Biblioteca de Exercicios</div>
            <div className="text-xs text-zinc-400">Explore +1.300 exercicios com animacao, musculos e equipamentos</div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-[var(--lime)] transition-colors"/>
        </div>
      </Link>

      {/* Alimentacao CTA */}
      <Link to="/alimentacao" className="group relative overflow-hidden rounded-2xl border border-white/10 p-0 block">
        <img
          src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/90 to-transparent" />
        <div className="relative flex items-center gap-4 p-5">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shrink-0">
            <Apple className="w-7 h-7 text-white"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-white">Alimentacao IA</div>
            <div className="text-xs text-zinc-400">Plano alimentar personalizado e analise de fotos de refeicoes</div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-orange-400 transition-colors"/>
        </div>
      </Link>

      {/* Lista de fichas - professor/admin */}
      {isTeacher && (
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-1 h-5 rounded-full bg-[var(--lime)]"/>
          <h3 className="text-sm font-black uppercase tracking-wide">Minhas Fichas</h3>
        </div>
        {workouts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#111112] p-10 text-center text-sm text-zinc-500">
            Nenhuma ficha ainda.
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
                  {(w.dias_semana || w.objetivo) && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {w.dias_semana && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/15 text-[9px] font-black text-[var(--lime)] uppercase tracking-wider">
                          <CalendarDays className="w-3 h-3" /> {w.dias_semana}
                        </span>
                      )}
                      {w.objetivo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-zinc-300 uppercase tracking-wider">
                          <Target className="w-3 h-3" /> {w.objetivo}
                        </span>
                      )}
                    </div>
                  )}
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
      )}
    </div>
  );
}
