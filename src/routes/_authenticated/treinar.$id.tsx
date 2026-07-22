import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { getFicha } from "@/lib/workouts.functions";
import { getExerciseById, BODYPART_PT, TARGET_PT, EQUIPMENT_PT, ptTerm, type Exercise } from "@/lib/exercisedb.functions";
import { ArrowLeft, X, Dumbbell, CheckCircle2, ChevronRight, ChevronLeft, Flag, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";

const fichaQO = (id: string) =>
  queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/treinar/$id")({
  component: TreinarPage,
});

function TreinarPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: ficha } = useSuspenseQuery(fichaQO(id));

  const allExercises = useMemo(
    () => ficha.groups.flatMap((g) => g.exercises),
    [ficha.groups],
  );

  const dbIds = useMemo(
    () => allExercises.filter((e) => e.exercise_db_id).map((e) => e.exercise_db_id!),
    [allExercises],
  );

  const exerciseDetails = useQuery({
    queryKey: ["ex", "details", dbIds],
    queryFn: async () => {
      const results = await Promise.all(
        dbIds.map((eid) => getExerciseById({ data: { id: eid } }).catch(() => null)),
      );
      return results.filter(Boolean) as Exercise[];
    },
    enabled: dbIds.length > 0,
    staleTime: 1000 * 60 * 60,
  });

  const detailMap = useMemo(() => {
    const m = new Map<string, Exercise>();
    (exerciseDetails.data ?? []).forEach((ex) => m.set(ex.id, ex));
    return m;
  }, [exerciseDetails.data]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = allExercises[currentIdx];
  const total = allExercises.length;
  const currentDetail = current?.exercise_db_id ? detailMap.get(current.exercise_db_id) : null;
  const reps = current?.sets_config?.[0]?.reps ?? "12";

  const goNext = () => {
    if (currentIdx < total - 1) setCurrentIdx((i) => i + 1);
    else setFinished(true);
  };

  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  if (finished) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5 text-center overflow-hidden" style={{ background: "linear-gradient(180deg, #0d0d0f 0%, #0a0a0a 50%, #0a0f0a 100%)" }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="absolute" style={{
              left: `${Math.random() * 100}%`, top: `-5%`,
              width: `${4 + Math.random() * 6}px`, height: `${4 + Math.random() * 6}px`,
              borderRadius: i % 3 === 0 ? "50%" : i % 3 === 1 ? "2px" : "0",
              background: ["var(--lime)", "#c8ff33", "#FFD400", "#fff", "#22c55e", "#84cc16", "#facc15"][i % 7],
              animation: `confettiFall ${2.5 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
              opacity: 0.85, transform: `rotate(${Math.random() * 360}deg)`,
            }} />
          ))}
        </div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(204,255,0,0.12), transparent)" }} />
        <div className="relative flex flex-col items-center gap-6 w-full max-w-xs">
          <div className="relative w-28 h-28">
            <div className="absolute inset-0 rounded-full bg-[var(--lime)]/15 animate-ping" style={{ animationDuration: "2.5s" }} />
            <div className="absolute inset-3 rounded-full bg-[var(--lime)]/10 animate-pulse" />
            <div className="relative w-28 h-28 rounded-full flex items-center justify-center" style={{
              background: "linear-gradient(135deg, var(--lime), #c8ff33)",
              boxShadow: "0 0 50px -10px rgba(204,255,0,0.4)",
            }}>
              <CheckCircle2 className="w-12 h-12 text-black" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-black text-white">Treino Concluido!</h1>
            <p className="text-sm text-zinc-400">
              <span className="font-bold text-[var(--lime)]">{total} exercicios</span> do Treino {ficha.workout.letra}
            </p>
          </div>
          <div className="w-full grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] py-3 px-2 space-y-0.5">
              <div className="text-lg font-black text-white">{total}</div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Exercicios</div>
            </div>
            <div className="rounded-xl border border-[var(--lime)]/20 bg-[var(--lime)]/5 py-3 px-2 space-y-0.5">
              <div className="text-lg font-black text-[var(--lime)]">100%</div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Progresso</div>
            </div>
          </div>
          <div className="w-full rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Progresso</span>
              <span className="text-[10px] font-black text-[var(--lime)]">100%</span>
            </div>
            <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: "100%", background: "linear-gradient(90deg, var(--lime), #c8ff33, var(--lime))", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />
            </div>
          </div>
          <button onClick={() => navigate({ to: "/app" })} className="w-full rounded-xl py-3.5 font-black text-sm text-black active:scale-[0.97] transition-all" style={{
            background: "linear-gradient(135deg, var(--lime), #c8ff33)",
            boxShadow: "0 6px 20px -5px rgba(204,255,0,0.3)",
          }}>
            Voltar ao Inicio
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Nenhum exercicio nesta ficha.</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <Link to="/app" className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] animate-pulse" />
            <span className="text-[10px] font-black text-[var(--lime)] uppercase tracking-widest">Treino {ficha.workout.letra}</span>
          </div>
          <Link to="/app" className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </Link>
        </div>

        {/* Progress bar + counter */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xs font-bold text-[var(--lime)] shrink-0">{currentIdx + 1}/{total}</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 bg-[var(--lime)]" style={{ width: `${((currentIdx + 1) / total) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-white/60 shrink-0">{Math.round(((currentIdx + 1) / total) * 100)}%</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 min-h-0">
        <div className="w-full max-w-sm space-y-5" key={`exercise-${currentIdx}`}>
          {/* GIF */}
          {currentDetail?.gifUrl ? (
            <div className="relative mx-auto w-full max-w-[260px]">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-[var(--lime)]/10 via-transparent to-[var(--lime)]/5 blur-sm" />
              <div className="relative rounded-2xl bg-white/95 overflow-hidden">
                <img src={currentDetail.gifUrl} alt={current.nome} className="w-full aspect-square object-contain" />
              </div>
            </div>
          ) : (
            <div className="relative mx-auto w-full max-w-[260px]">
              <div className="relative rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center aspect-square">
                <Dumbbell className="w-20 h-20 text-zinc-700" />
              </div>
            </div>
          )}

          {/* Name + tags */}
          <div className="text-center">
            <h3 className="text-xl font-black text-white capitalize">{current.nome}</h3>
            {currentDetail && (
              <div className="flex justify-center flex-wrap gap-2 mt-2">
                {currentDetail.target && (
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[var(--lime)]/12 text-[var(--lime)] border border-[var(--lime)]/20">
                    {ptTerm(TARGET_PT, currentDetail.target) ?? currentDetail.target}
                  </span>
                )}
                {currentDetail.equipment && (
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/10">
                    {ptTerm(EQUIPMENT_PT, currentDetail.equipment) ?? currentDetail.equipment}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Series x Reps summary */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-4 px-5 text-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Series x Repeticoes</div>
            <div className="flex items-center justify-center gap-4">
              <div>
                <span className="text-3xl font-black text-white">{current.series}</span>
                <span className="text-sm text-zinc-400 ml-1">series</span>
              </div>
              <span className="text-2xl text-zinc-600 font-bold">de</span>
              <div>
                <span className="text-3xl font-black text-[var(--lime)]">{reps}</span>
                <span className="text-sm text-zinc-400 ml-1">repeticoes</span>
              </div>
            </div>
          </div>

          {/* Obs */}
          {current.obs && (
            <p className="text-xs text-zinc-500 text-center">{current.obs}</p>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="shrink-0 px-4 pb-6 pt-2 border-t border-white/5">
        <div className="flex justify-center gap-3 max-w-sm mx-auto">
          {currentIdx > 0 && (
            <button onClick={goPrev} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-sm font-bold text-white hover:bg-white/10 transition-all">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
          )}
          <button onClick={goNext} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black text-black transition-all hover:brightness-110" style={{ background: "linear-gradient(135deg, var(--lime), #a3e635)", boxShadow: "0 8px 30px -5px rgba(163,230,53,0.35)" }}>
            {currentIdx < total - 1 ? (<>Proximo <ChevronRight className="w-4 h-4" /></>) : (<>Finalizar <Flag className="w-4 h-4" /></>)}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes completionFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 200% center; }
        }
        @keyframes trophyPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}