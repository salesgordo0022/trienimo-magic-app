import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listWorkouts, listAssignedToMe } from "@/lib/workouts.functions";
import { getMyRole } from "@/lib/roles.functions";
import { Dumbbell, ChevronRight, X, FileText, ListChecks, Flag } from "lucide-react";
import { useState } from "react";

const workoutsQO = () => queryOptions({ queryKey: ["workouts"], queryFn: () => listWorkouts() });
const assignedQO = () => queryOptions({ queryKey: ["assigned"], queryFn: () => listAssignedToMe() });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });

export const Route = createFileRoute("/_authenticated/meu-treino")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(workoutsQO());
    context.queryClient.ensureQueryData(assignedQO());
    context.queryClient.ensureQueryData(roleQO());
  },
  component: MeuTreino,
});

function MeuTreino() {
  const { data: workouts } = useSuspenseQuery(workoutsQO());
  const { data: assigned } = useSuspenseQuery(assignedQO());
  const { data: myRole } = useSuspenseQuery(roleQO());
  const isTeacher = myRole.role === "admin" || myRole.role === "professor";
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);

  const all = isTeacher ? [...assigned, ...workouts] : assigned;
  const selectedW = all.find(x => x.id === selectedWorkout);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black">Meu Treino</h1>
        <p className="text-sm text-zinc-500 mt-1">Selecione a ficha para comecar.</p>
      </div>
      {all.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#111112] p-10 text-center text-sm text-zinc-500">
          Nenhuma ficha disponivel ainda.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {all.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWorkout(w.id)}
              className="group rounded-2xl border border-white/10 bg-[#111112] p-5 flex items-center gap-4 hover:border-[var(--lime)]/40 transition-all text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-[var(--lime)] text-black font-black text-2xl flex items-center justify-center">{w.letra}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">Treino {w.letra}</div>
                {w.nome && <div className="text-xs text-zinc-500 truncate">{w.nome}</div>}
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[var(--lime)] group-hover:bg-[var(--lime)] group-hover:text-black transition-all">
                <ChevronRight className="w-5 h-5"/>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedWorkout && selectedW && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: "#0a0a0a" }}>
          <div className="fixed inset-0 z-0 pointer-events-none">
            <img
              src="https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80"
              alt=""
              className="w-full h-full object-cover opacity-15"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]" />
          </div>

          <div className="relative z-10 shrink-0 px-5 pt-5 pb-2 safe-top">
            <div className="flex items-center justify-between mb-1">
              <div />
              <button onClick={() => setSelectedWorkout(null)} className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-[var(--lime)]/10 blur-[40px]" />
              <div
                className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--lime), #a8d400)",
                  boxShadow: "0 20px 50px -10px rgba(204,255,0,0.3)",
                }}
              >
                <span className="text-5xl font-black text-black">{selectedW.letra}</span>
              </div>
            </div>

            <div className="text-center mb-8 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/15 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] animate-pulse" />
                <span className="text-[10px] font-black text-[var(--lime)] uppercase tracking-widest">Seu Treino</span>
              </div>
              <h1 className="text-3xl font-black text-white">Treino {selectedW.letra}</h1>
              {selectedW.nome && <p className="text-sm text-zinc-400">{selectedW.nome}</p>}
              {selectedW.assigned_nome && (
                <p className="text-xs text-zinc-500">
                  Prescrito por <span className="font-bold text-zinc-400">{selectedW.assigned_nome}</span>
                </p>
              )}
            </div>

            <div className="w-full max-w-sm space-y-3">
              <Link
                to="/treinar/$id"
                params={{ id: selectedWorkout }}
                onClick={() => setSelectedWorkout(null)}
                className="w-full group relative overflow-hidden rounded-2xl border border-[var(--lime)]/15 p-0 text-left transition-all hover:border-[var(--lime)]/30 active:scale-[0.98] block"
              >
                <img
                  src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/90 to-transparent" />
                <div className="relative flex items-center gap-4 p-5">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--lime)]/10 border border-[var(--lime)]/15 flex items-center justify-center shrink-0">
                    <ListChecks className="w-6 h-6 text-[var(--lime)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-black text-white mb-0.5">Passo a Passo</div>
                    <div className="text-xs text-zinc-400 leading-relaxed">Exercicio por exercicio com series e progresso</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-[var(--lime)] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Link>

              <Link
                to="/ficha/$id"
                params={{ id: selectedWorkout }}
                search={{ tab: "ficha" }}
                onClick={() => setSelectedWorkout(null)}
                className="w-full group relative overflow-hidden rounded-2xl border border-white/8 p-0 text-left transition-all hover:border-white/15 active:scale-[0.98] block"
              >
                <img
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/90 to-transparent" />
                <div className="relative flex items-center gap-4 p-5">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-zinc-300 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-black text-white mb-0.5">Ver Ficha</div>
                    <div className="text-xs text-zinc-400 leading-relaxed">Veja todos os exercicios, series e cargas do seu treino</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
