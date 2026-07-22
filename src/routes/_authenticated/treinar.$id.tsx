import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getFicha } from "@/lib/workouts.functions";
import {
  ArrowLeft, Dumbbell, CheckCircle2, Circle, ChevronRight,
  ChevronLeft, Play, Trophy
} from "lucide-react";
import { useState, useMemo } from "react";

const fichaQO = (id: string) =>
  queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/treinar/$id")({
  component: TreinarPage,
});

function TreinarPage() {
  const { id } = Route.useParams();
  const { data: ficha } = useSuspenseQuery(fichaQO(id));

  const allExercises = useMemo(
    () => ficha.groups.flatMap((g) => g.exercises),
    [ficha.groups],
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);

  const current = allExercises[currentIdx];
  const total = allExercises.length;
  const progress = total > 0 ? Math.round((completed.size / total) * 100) : 0;

  const toggleComplete = (exId: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  };

  const goNext = () => {
    if (currentIdx < total - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setFinished(true);
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  if (finished) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto">
        <div className="rounded-2xl border border-white/10 bg-[#111112] p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--lime)] flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-xl font-black text-white">Treino Concluido!</h2>
          <p className="text-sm text-zinc-400">
            {completed.size} de {total} exercicios realizados
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {allExercises.map((ex) => (
              <div
                key={ex.id}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  completed.has(ex.id)
                    ? "bg-[var(--lime)] text-black"
                    : "bg-white/10 text-zinc-500"
                }`}
              >
                {completed.has(ex.id) ? <CheckCircle2 className="w-4 h-4" /> : ex.nome[0]}
              </div>
            ))}
          </div>
          <Link
            to="/app"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black px-6 py-3 font-bold text-sm hover:brightness-110 transition-all mt-2"
          >
            <Dumbbell className="w-4 h-4" /> Voltar ao Inicio
          </Link>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto">
        <div className="rounded-2xl border border-white/10 bg-[#111112] p-8 text-center text-zinc-500">
          Nenhum exercicio nesta ficha.
        </div>
      </div>
    );
  }

  const currentGroup = ficha.groups.find((g) =>
    g.exercises.some((e) => e.id === current.id),
  );

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/app"
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-black text-white truncate">Treino {ficha.workout.letra}</h1>
          <p className="text-[11px] text-zinc-500">
            Exercicio {currentIdx + 1} de {total}
          </p>
        </div>
        <div className="text-xs font-bold text-[var(--lime)]">{progress}%</div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--lime)] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Exercise card */}
      <div className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
        {/* Group badge */}
        {currentGroup && (
          <div className="px-4 pt-3">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-white/5 px-2.5 py-1 rounded-lg">
              <Dumbbell className="w-3 h-3" />
              {currentGroup.nome}
            </div>
          </div>
        )}

        {/* Exercise name */}
        <div className="px-4 pt-2 pb-4">
          <h2 className="text-xl font-black text-white capitalize">{current.nome}</h2>
          {current.obs && (
            <p className="text-xs text-zinc-500 mt-1">{current.obs}</p>
          )}
        </div>

        {/* Sets */}
        {current.series > 0 && (
          <div className="px-4 pb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
              Series
            </div>
            <div className="space-y-2">
              {Array.from({ length: current.series }).map((_, i) => {
                const cfg = current.sets_config?.[i];
                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                      completed.has(current.id)
                        ? "border-[var(--lime)]/30 bg-[var(--lime)]/5"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <button
                      onClick={() => toggleComplete(current.id)}
                      className="shrink-0"
                    >
                      {completed.has(current.id) ? (
                        <CheckCircle2 className="w-5 h-5 text-[var(--lime)]" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-600 hover:text-zinc-400 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-zinc-400">
                        {i + 1}
                      </div>
                      {cfg?.reps && (
                        <div className="text-sm font-bold text-white">{cfg.reps} rep.</div>
                      )}
                      {cfg?.kg && (
                        <div className="text-sm text-zinc-400">{cfg.kg} kg</div>
                      )}
                      {!cfg?.reps && !cfg?.kg && (
                        <div className="text-sm text-zinc-400">{current.series} series</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No sets configured */}
        {current.series === 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => toggleComplete(current.id)}
              className={`w-full rounded-xl border p-4 flex items-center gap-3 transition-all ${
                completed.has(current.id)
                  ? "border-[var(--lime)]/30 bg-[var(--lime)]/5"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {completed.has(current.id) ? (
                <CheckCircle2 className="w-5 h-5 text-[var(--lime)]" />
              ) : (
                <Circle className="w-5 h-5 text-zinc-600" />
              )}
              <span className="text-sm text-zinc-400">
                {completed.has(current.id) ? "Concluido" : "Marcar como concluido"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        {currentIdx > 0 && (
          <button
            onClick={goPrev}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#111112] px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
        )}
        <button
          onClick={goNext}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black px-4 py-3 text-sm font-bold hover:brightness-110 transition-all"
        >
          {currentIdx < total - 1 ? (
            <>Proximo <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>Finalizar <Play className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
