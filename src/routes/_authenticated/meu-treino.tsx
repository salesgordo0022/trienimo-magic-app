import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listWorkouts, listAssignedToMe } from "@/lib/workouts.functions";
import { Dumbbell, ChevronRight } from "lucide-react";

const workoutsQO = () => queryOptions({ queryKey: ["workouts"], queryFn: () => listWorkouts() });
const assignedQO = () => queryOptions({ queryKey: ["assigned"], queryFn: () => listAssignedToMe() });

export const Route = createFileRoute("/_authenticated/meu-treino")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(workoutsQO());
    context.queryClient.ensureQueryData(assignedQO());
  },
  component: MeuTreino,
});

function MeuTreino() {
  const { data: workouts } = useSuspenseQuery(workoutsQO());
  const { data: assigned } = useSuspenseQuery(assignedQO());
  const all = [...assigned, ...workouts];
  const primary = all[0];

  if (primary && all.length === 1) {
    return <Navigate to="/ficha/$id" params={{ id: primary.id }} replace/>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black">Meu Treino</h1>
        <p className="text-sm text-zinc-500 mt-1">Selecione a ficha para começar.</p>
      </div>
      {all.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#111112] p-10 text-center text-sm text-zinc-500">
          Nenhuma ficha disponível ainda.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {all.map(w => (
            <Link key={w.id} to="/ficha/$id" params={{ id: w.id }} className="group rounded-2xl border border-white/10 bg-[#111112] p-5 flex items-center gap-4 hover:border-[var(--lime)]/40 transition-all">
              <div className="w-14 h-14 rounded-xl bg-[var(--lime)] text-black font-black text-2xl flex items-center justify-center">{w.letra}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">Treino {w.letra}</div>
                {w.nome && <div className="text-xs text-zinc-500 truncate">{w.nome}</div>}
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[var(--lime)] group-hover:bg-[var(--lime)] group-hover:text-black transition-all">
                <ChevronRight className="w-5 h-5"/>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
