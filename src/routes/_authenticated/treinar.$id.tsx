import { onGifError } from "@/lib/exercise-gif-fallback";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFicha, startSession, endSession } from "@/lib/workouts.functions";
import { exerciseGifUrl } from "@/lib/exercisedb.functions";
import { ArrowLeft, X, Dumbbell, CheckCircle2, ChevronRight, ChevronLeft, Flag, TrendingUp, Sparkles } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";

const fichaQO = (id: string) =>
  queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/treinar/$id")({
  component: TreinarPage,
});

function TreinarPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: ficha } = useSuspenseQuery(fichaQO(id));
  const startSessionFn = useServerFn(startSession);
  const endSessionFn = useServerFn(endSession);

  const allExercises = useMemo(
    () => ficha.groups.flatMap((g) => g.exercises),
    [ficha.groups],
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [animPhase, setAnimPhase] = useState(0);
  const [countUp, setCountUp] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startSessionFn({ data: { workout_id: id } }).then((s) => {
      setSessionId(s.id);
    }).catch(() => {});
  }, [id, startSessionFn]);

  const current = allExercises[currentIdx];
  const total = allExercises.length;
  const currentGifUrl = current?.exercise_db_id ? exerciseGifUrl(current.exercise_db_id) : null;
  const reps = current?.sets_config?.[0]?.reps ?? "12";

  const goNext = () => {
    if (currentIdx < total - 1) setCurrentIdx((i) => i + 1);
    else finishWorkout();
  };

  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  const finishWorkout = async () => {
    if (sessionId) {
      try { await endSessionFn({ data: { id: sessionId } }); } catch {}
    }
    qc.invalidateQueries({ queryKey: ["assigned"] });
    qc.invalidateQueries({ queryKey: ["completedWorkoutIds"] });
    qc.invalidateQueries({ queryKey: ["completedToday"] });
    qc.invalidateQueries({ queryKey: ["allSessions"] });
    setFinished(true);
    setTimeout(() => setAnimPhase(1), 300);
    setTimeout(() => setAnimPhase(2), 800);
    setTimeout(() => setAnimPhase(3), 1300);
    const timer = setInterval(() => {
      setCountUp((p) => {
        if (p >= total) { clearInterval(timer); return total; }
        return p + 1;
      });
    }, 40);
  };

  if (finished) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5 text-center overflow-hidden" style={{ background: "linear-gradient(180deg, #0d0d0f 0%, #0a0a0a 50%, #0a0f0a 100%)" }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 80 }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-8%`,
                width: `${3 + Math.random() * 8}px`,
                height: `${3 + Math.random() * 8}px`,
                borderRadius: i % 4 === 0 ? "50%" : i % 4 === 1 ? "2px" : i % 4 === 2 ? "0" : "30%",
                background: ["var(--lime)", "#c8ff33", "#FFD400", "#fff", "#22c55e", "#84cc16", "#facc15", "#a855f7", "#3b82f6", "#ec4899"][i % 10],
                animation: `confettiFall ${3 + Math.random() * 4}s linear ${Math.random() * 2.5}s infinite`,
                opacity: 0.9,
                transform: `rotate(${Math.random() * 360}deg) scale(${0.5 + Math.random()})`,
              }}
            />
          ))}
        </div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(204,255,0,0.12), transparent)" }} />
        <div className="relative flex flex-col items-center gap-5 w-full max-w-xs">
          <div
            className="relative w-28 h-28"
            style={{ animation: animPhase >= 0 ? "popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards" : "none" }}
          >
            <div className="absolute inset-0 rounded-full bg-[var(--lime)]/15 animate-ping" style={{ animationDuration: "2.5s" }} />
            <div className="absolute inset-3 rounded-full bg-[var(--lime)]/10 animate-pulse" />
            <div className="relative w-28 h-28 rounded-full flex items-center justify-center" style={{
              background: "linear-gradient(135deg, var(--lime), #c8ff33)",
              boxShadow: "0 0 60px -5px rgba(204,255,0,0.5)",
            }}>
              <CheckCircle2 className="w-12 h-12 text-black" />
            </div>
          </div>

          <div
            className="space-y-1.5"
            style={{ animation: animPhase >= 1 ? "completionFadeUp 0.5s ease-out forwards" : "none", opacity: 0 }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/20 mb-2">
              <Sparkles className="w-3 h-3 text-[var(--lime)]" />
              <span className="text-[9px] font-black text-[var(--lime)] uppercase tracking-widest">Treino Completo</span>
            </div>
            <h1 className="text-3xl font-black text-white">Parabens!</h1>
            <p className="text-sm text-zinc-400">
              Voce completou o Treino <span className="font-bold text-[var(--lime)]">{ficha.workout.letra}</span>
            </p>
          </div>

          <div
            className="w-full grid grid-cols-2 gap-2.5"
            style={{ animation: animPhase >= 2 ? "completionFadeUp 0.5s ease-out forwards" : "none", opacity: 0 }}
          >
            <div className="rounded-xl border border-white/8 bg-white/[0.03] py-3 px-2 space-y-0.5">
              <div className="text-lg font-black text-white tabular-nums">{countUp}</div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Exercicios</div>
            </div>
            <div className="rounded-xl border border-[var(--lime)]/20 bg-[var(--lime)]/5 py-3 px-2 space-y-0.5">
              <div className="text-lg font-black text-[var(--lime)]">100%</div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Progresso</div>
            </div>
          </div>

          <div
            className="w-full rounded-xl border border-white/8 bg-white/[0.03] p-3.5"
            style={{ animation: animPhase >= 2 ? "completionFadeUp 0.5s ease-out forwards" : "none", opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Progresso</span>
              <span className="text-[10px] font-black text-[var(--lime)]">100%</span>
            </div>
            <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: "100%", background: "linear-gradient(90deg, var(--lime), #c8ff33, var(--lime))", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />
            </div>
          </div>

          <div
            className="w-full space-y-2.5"
            style={{ animation: animPhase >= 3 ? "completionFadeUp 0.5s ease-out forwards" : "none", opacity: 0 }}
          >
            <Link
              to="/perfil"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--lime)]/20 bg-[var(--lime)]/5 py-3.5 text-sm font-bold text-[var(--lime)] hover:bg-[var(--lime)]/10 active:scale-[0.97] transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              Ver Evolucao
            </Link>
            <button
              onClick={() => { qc.invalidateQueries({ queryKey: ["assigned"] }); qc.invalidateQueries({ queryKey: ["completedWorkoutIds"] }); navigate({ to: "/app" }); }}
              className="w-full rounded-xl py-3.5 font-black text-sm text-black active:scale-[0.97] transition-all"
              style={{
                background: "linear-gradient(135deg, var(--lime), #c8ff33)",
                boxShadow: "0 6px 20px -5px rgba(204,255,0,0.3)",
              }}
            >
              Voltar ao Inicio
            </button>
          </div>
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
          {currentGifUrl ? (
            <div className="relative mx-auto w-full max-w-[260px]">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-[var(--lime)]/10 via-transparent to-[var(--lime)]/5 blur-sm" />
              <div className="relative rounded-2xl bg-white/95 overflow-hidden">
                <img src={currentGifUrl} alt={current.nome} className="w-full aspect-square object-contain"  onError={onGifError} />
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