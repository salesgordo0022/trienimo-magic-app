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

  return (
    <div className="min-h-screen bg-[#111112] flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <Link to="/app" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">Treino {ficha.workout.letra}</div>
          </div>
          <button onClick={() => toggleComplete(current.id)} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
            completed.has(current.id) ? "bg-[var(--lime)] text-black" : "bg-white/5 text-zinc-400"
          }`}>
            {completed.has(current.id) ? "Feito" : "Pular"}
          </button>
        </div>

        {/* Progress bar + counter */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[var(--lime)] shrink-0">{doneCount}/{total}</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[var(--lime)] transition-all duration-500" style={{ width: `${Math.round((doneCount / total) * 100)}%` }} />
          </div>
          <span className="text-xs font-bold text-white/60 shrink-0">{Math.round((doneCount / total) * 100)}%</span>
        </div>
      </div>

      {/* Exercise */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        {currentGroup && (
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-white/5 px-2.5 py-1 rounded-lg self-start mb-3">
            <Dumbbell className="w-3 h-3" />
            {currentGroup.nome}
          </div>
        )}

        <h2 className="text-2xl font-black text-white mb-1 capitalize text-center">{current.nome}</h2>

        {current.obs && (
          <p className="text-xs text-zinc-500 mb-5 text-center">{current.obs}</p>
        )}

        {/* Series x Reps summary */}
        {current.series > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-5 px-6 text-center w-full max-w-sm">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Series x Repeticoes</div>
            <div className="flex items-center justify-center gap-4">
              <div>
                <span className="text-3xl font-black text-white">{current.series}</span>
                <span className="text-sm text-zinc-400 ml-1">series</span>
              </div>
              <span className="text-2xl text-zinc-600 font-bold">de</span>
              <div>
                <span className="text-3xl font-black text-[var(--lime)]">{current.sets_config?.[0]?.reps ?? "12"}</span>
                <span className="text-sm text-zinc-400 ml-1">repeticoes</span>
              </div>
            </div>
          </div>
        )}

        {current.series === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-zinc-400 text-sm">
            Sem series configuradas
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="shrink-0 px-4 py-4 border-t border-white/5">
        <div className="flex justify-center gap-3 max-w-sm mx-auto">
          {currentIdx > 0 && (
            <button onClick={goPrev} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-sm font-bold text-white hover:bg-white/10 transition-all">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
          )}
          <button onClick={goNext} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black text-black hover:brightness-110 transition-all" style={{ background: "linear-gradient(135deg, var(--lime), #a3e635)", boxShadow: "0 8px 30px -5px rgba(163,230,53,0.35)" }}>
            {currentIdx < total - 1 ? <>Proximo <ChevronRight className="w-4 h-4" /></> : <>Finalizar <Flag className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
