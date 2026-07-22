import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getFicha } from "@/lib/workouts.functions";
import { ArrowLeft, Dumbbell, ListChecks } from "lucide-react";

const fichaQO = (id: string) =>
  queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/treinar/$id")({
  component: TreinarPage,
});

function TreinarPage() {
  const { id } = Route.useParams();
  const { data: ficha } = useSuspenseQuery(fichaQO(id));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-lg mx-auto">
      <Link
        to="/app"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </Link>

      <header className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center mx-auto">
          <Dumbbell className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white">
          Treino {ficha.workout.letra}
          {ficha.workout.nome ? ` — ${ficha.workout.nome}` : ""}
        </h1>
        <p className="text-sm text-zinc-500">
          Como você quer treinar hoje?
        </p>
      </header>

      <div className="space-y-3">
        <Link
          to="/ficha/$id"
          params={{ id }}
          search={{ tab: "executar" }}
          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111112] p-5 hover:border-[var(--lime)]/40 transition-all group"
        >
          <div className="w-14 h-14 rounded-2xl bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center shrink-0 group-hover:bg-[var(--lime)]/25 transition-colors">
            <ListChecks className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-black text-white">Passo a Passo</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Siga exercício por exercício com timer de descanso e registro de séries.
            </div>
          </div>
        </Link>

        <Link
          to="/ficha/$id"
          params={{ id }}
          search={{ tab: "ficha" }}
          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111112] p-5 hover:border-[var(--lime)]/40 transition-all group"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-black text-white">Ficha</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Visualize todos os exercícios, grupos e séries de uma vez.
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
