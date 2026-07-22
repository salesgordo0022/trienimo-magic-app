import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getFicha } from "@/lib/workouts.functions";
import { ArrowLeft, Dumbbell, CheckCircle2, ChevronRight, ChevronLeft, Flag } from "lucide-react";
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
  const doneCount = completed.size;

  const toggleComplete = (exId: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  };

  const goNext = () => {
    if (currentIdx < total - 1) setCurrentIdx((i) => i + 1);
    else setFinished(true);
  };

  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  if (finished) {
    return (
      <div className="min-h-screen bg-[#111112] flex items-center justify-center p-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-[var(--lime)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-2xl font-black text-white">Treino Concluido!</h2>
          <p className="text-zinc-400 text-sm">{doneCount} de {total} exercicios realizados</p>
          <div className="flex flex-wrap justify-center gap-2">
            {allExercises.map((ex) => (
              <div key={ex.id} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                completed.has(ex.id) ? "bg-[var(--lime)] text-black" : "bg-white/10 text-zinc-600"
              }`}>
                {completed.has(ex.id) ? <CheckCircle2 className="w-4 h-4" /> : ex.nome[0].toUpperCase()}
              </div>
            ))}
          </div>
          <Link to="/app" className="inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] text-black px-8 py-3.5 font-bold text-sm hover:brightness-110 transition-all mt-2">
            <Dumbbell className="w-4 h-4" /> Voltar ao Inicio
          </Link>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen bg-[#111112] flex items-center justify-center p-4">
        <div className="text-zinc-500 text-sm">Nenhum exercicio nesta ficha.</div>
      </div>
    );
  }

  const currentGroup = ficha.groups.find((g) =>
    g.exercises.some((e) => e.id === current.id),
  );

  const isDone = completed.has(current.id);

  return (
    <div className="min-h-screen bg-[#111112] flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <Link to="/app" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white truncate">Treino {ficha.workout.letra}</div>
          <div className="text-[10px] text-zinc-500">{doneCount} de {total}</div>
        </div>
        <button onClick={() => toggleComplete(current.id)} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
          isDone ? "bg-[var(--lime)] text-black" : "bg-white/5 text-zinc-400"
        }`}>
          {isDone ? "Feito" : "Pular"}
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 pb-4">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-[var(--lime)] transition-all duration-500" style={{ width: `${Math.round((doneCount / total) * 100)}%` }} />
        </div>
      </div>

      {/* Exercise */}
      <div className="flex-1 flex flex-col px-4">
        {currentGroup && (
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-white/5 px-2.5 py-1 rounded-lg self-start mb-3">
            <Dumbbell className="w-3 h-3" />
            {currentGroup.nome}
          </div>
        )}

        <h2 className="text-2xl font-black text-white mb-1 capitalize">{current.nome}</h2>

        {current.obs && (
          <p className="text-xs text-zinc-500 mb-4">{current.obs}</p>
        )}

        {/* Reps per set - simple list */}
        {current.series > 0 && (
          <div className="space-y-2 mt-2">
            {Array.from({ length: current.series }).map((_, i) => {
              const cfg = current.sets_config?.[i];
              return (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[var(--lime)]/10 flex items-center justify-center text-xs font-bold text-[var(--lime)]">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    {cfg?.reps && <span className="text-lg font-black text-white">{cfg.reps} repeticoes</span>}
                    {cfg?.kg && <span className="text-base text-zinc-400 ml-2">{cfg.kg} kg</span>}
                    {!cfg?.reps && !cfg?.kg && <span className="text-base text-zinc-400">{current.series} series</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {current.series === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-zinc-400 text-sm mt-2">
            Sem series configuradas
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="px-4 py-4 flex justify-center gap-3">
        {currentIdx > 0 && (
          <button onClick={goPrev} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#111112] px-6 py-3.5 text-sm font-bold text-zinc-300 hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
        )}
        <button onClick={goNext} className="inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] text-black px-8 py-3.5 text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-[var(--lime)]/20">
          {currentIdx < total - 1 ? <>Proximo <ChevronRight className="w-4 h-4" /></> : <>Finalizar <Flag className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
