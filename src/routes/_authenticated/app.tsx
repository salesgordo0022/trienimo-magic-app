import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWorkouts, listAssignedToMe, createWorkout, deleteWorkout } from "@/lib/workouts.functions";
import { getMyRole, listMyStudents, searchUserByEmail, linkStudent } from "@/lib/roles.functions";
import { searchExercises, BODYPART_PT, type Exercise } from "@/lib/exercisedb.functions";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Pencil, History, Dumbbell, ChevronRight, TrendingUp, Calendar, Flame, Users, BookOpen, ListChecks, X, FileText, Loader2, ArrowLeft, Play, Pause, SkipForward, RotateCcw, Flag, Apple } from "lucide-react";

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
  const [meuTreinoModal, setMeuTreinoModal] = useState<string | null>(null);
  const [novoTreinoModal, setNovoTreinoModal] = useState(false);
  const [novoStep, setNovoStep] = useState<"choice" | "ficha" | "bodyparts" | "exercise" | "completed">("choice");
  const [letra, setLetra] = useState("");
  const [nome, setNome] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [exerciseConfig, setExerciseConfig] = useState<Record<number, { sets: number; reps: number; rest: number }>>({});
  const [currentSet, setCurrentSet] = useState(1);
  const [restTimer, setRestTimer] = useState({ active: false, seconds: 0, total: 0 });
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getExerciseConfig = (idx: number) => {
    if (exerciseConfig[idx]) return exerciseConfig[idx];
    const ex = exerciseList[idx];
    if (!ex) return { sets: 3, reps: 12, rest: 60 };
    const isCardio = ex.bodyPart === "cardio";
    const isLegs = ex.bodyPart === "upper legs" || ex.bodyPart === "lower legs";
    return isCardio
      ? { sets: 3, reps: 1, rest: 45 }
      : isLegs
        ? { sets: 4, reps: 10, rest: 90 }
        : { sets: 3, reps: 12, rest: 60 };
  };

  const startRestTimer = useCallback((seconds: number) => {
    setRestTimer({ active: true, seconds, total: seconds });
  }, []);

  useEffect(() => {
    if (restTimer.active && restTimer.seconds > 0) {
      restRef.current = setInterval(() => {
        setRestTimer(prev => {
          if (prev.seconds <= 1) {
            if (restRef.current) clearInterval(restRef.current);
            return { active: false, seconds: 0, total: 0 };
          }
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1000);
    }
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [restTimer.active]);

  const BODY_PARTS = [
    { key: "chest", label: "Peito", img: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop&crop=center", accent: "from-red-500/20 to-red-900/10" },
    { key: "back", label: "Costas", img: "https://images.unsplash.com/photo-1603287681836-b1a467a28a2e?w=400&h=400&fit=crop&crop=center", accent: "from-blue-500/20 to-blue-900/10" },
    { key: "shoulders", label: "Ombros", img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&h=400&fit=crop&crop=top", accent: "from-purple-500/20 to-purple-900/10" },
    { key: "upper arms", label: "Bracos", img: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=400&fit=crop&crop=center", accent: "from-amber-500/20 to-amber-900/10" },
    { key: "upper legs", label: "Pernas", img: "https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&h=400&fit=crop&crop=center", accent: "from-emerald-500/20 to-emerald-900/10" },
    { key: "lower legs", label: "Panturrilha", img: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=400&fit=crop&crop=bottom", accent: "from-teal-500/20 to-teal-900/10" },
    { key: "waist", label: "Abdomen", img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center", accent: "from-orange-500/20 to-orange-900/10" },
    { key: "cardio", label: "Cardio", img: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&h=400&fit=crop&crop=center", accent: "from-pink-500/20 to-pink-900/10" },
  ];

  const openNovoTreino = () => {
    setNovoTreinoModal(true);
    setNovoStep("choice");
    setLetra(""); setNome(""); setAssignTo("");
    setSelectedBodyPart(""); setExerciseList([]); setExerciseIndex(0);
    setExerciseConfig({}); setCurrentSet(1);
    setRestTimer({ active: false, seconds: 0, total: 0 });
    setCompletedExercises(new Set());
  };

  const startPassoAPasso = async (bodyPart: string) => {
    setSelectedBodyPart(bodyPart);
    setNovoStep("exercise");
    setLoadingExercises(true);
    setExerciseIndex(0);
    setCurrentSet(1);
    setRestTimer({ active: false, seconds: 0, total: 0 });
    setCompletedExercises(new Set());
    try {
      const exercises = await searchExercises({ data: { bodyPart, limit: 20, offset: 0 } });
      setExerciseList(exercises);
      const cfg: Record<number, { sets: number; reps: number; rest: number }> = {};
      exercises.forEach((ex, i) => {
        const isCardio = ex.bodyPart === "cardio";
        const isLegs = ex.bodyPart === "upper legs" || ex.bodyPart === "lower legs";
        cfg[i] = isCardio
          ? { sets: 3, reps: 1, rest: 45 }
          : isLegs
            ? { sets: 4, reps: 10, rest: 90 }
            : { sets: 3, reps: 12, rest: 60 };
      });
      setExerciseConfig(cfg);
    } catch {
      toast.error("Erro ao carregar exerc\u00EDcios. Verifique a API.");
      setExerciseList([]);
    }
    setLoadingExercises(false);
  };

  const advanceExercise = () => {
    setCompletedExercises(prev => new Set(prev).add(exerciseIndex));
    if (exerciseIndex < exerciseList.length - 1) {
      const cfg = getExerciseConfig(exerciseIndex);
      startRestTimer(cfg.rest);
      setTimeout(() => {
        setExerciseIndex(exerciseIndex + 1);
        setCurrentSet(1);
      }, 500);
    } else {
      setNovoStep("completed");
    }
  };

  const advanceSet = () => {
    const cfg = getExerciseConfig(exerciseIndex);
    if (currentSet < cfg.sets) {
      setCurrentSet(currentSet + 1);
      startRestTimer(cfg.rest);
    } else {
      advanceExercise();
    }
  };

  const currentExercise = exerciseList[exerciseIndex] ?? null;

  const primary = assigned[0] ?? workouts[0];

  const create = useMutation({
    mutationFn: useServerFn(createWorkout),
    onSuccess: (r: { id: string }) => {
      qc.invalidateQueries({ queryKey: ["workouts"] });
      setLetra(""); setNome(""); setAssignTo("");
      toast.success("Treino criado com sucesso!");
      navigate({ to: "/ficha/$id", params: { id: r.id } });
    },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteWorkout),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts"] }),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Hero — Meu Treino */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--lime)]/30 bg-black p-6 sm:p-8 min-h-[200px]">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--lime)] flex items-center justify-center shrink-0 shadow-2xl">
            <Dumbbell className="w-8 h-8 sm:w-10 sm:h-10 text-black"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lime)]">Treino de hoje</div>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mt-1">Meu Treino</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {primary ? `Acessar treino ${primary.letra}${primary.nome ? " — " + primary.nome : ""}` : "Nenhum treino disponivel ainda."}
            </p>
          </div>
          {primary && (
            <button
              onClick={() => setMeuTreinoModal(primary.id)}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] text-black px-5 py-3 font-bold text-sm hover:brightness-110 transition-all"
            >
              Acessar <ChevronRight className="w-4 h-4"/>
            </button>
          )}
        </div>
      </section>

      {/* Modal Meu Treino */}
      {meuTreinoModal && (() => {
        const w = [...workouts, ...assigned].find(x => x.id === meuTreinoModal);
        return (
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
                <button onClick={() => setMeuTreinoModal(null)} className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
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
                  <span className="text-5xl font-black text-black">{w?.letra ?? "?"}</span>
                </div>
              </div>

              <div className="text-center mb-8 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/15 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] animate-pulse" />
                  <span className="text-[10px] font-black text-[var(--lime)] uppercase tracking-widest">Seu Treino</span>
                </div>
                <h1 className="text-3xl font-black text-white">Treino {w?.letra ?? ""}</h1>
                {w?.nome && <p className="text-sm text-zinc-400">{w.nome}</p>}
                {w?.assigned_nome && (
                  <p className="text-xs text-zinc-500">
                    Prescrito por <span className="font-bold text-zinc-400">{w.assigned_nome}</span>
                  </p>
                )}
              </div>

              <div className="w-full max-w-sm space-y-3">
                <Link
                  to="/ficha/$id"
                  params={{ id: meuTreinoModal }}
                  search={{ tab: "executar" }}
                  onClick={() => setMeuTreinoModal(null)}
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
                      <div className="text-xs text-zinc-400 leading-relaxed">Exercicio por exercicio com timer de descanso e series</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-[var(--lime)] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </Link>

                <Link
                  to="/ficha/$id"
                  params={{ id: meuTreinoModal }}
                  search={{ tab: "ficha" }}
                  onClick={() => setMeuTreinoModal(null)}
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
        );
      })()}

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

      {/* Vincular Aluno (professor only) */}
      {isTeacher && (
        <VincularAlunoSection studentsQO={studentsQO} />
      )}

      {/* Criar novo treino */}
      <button
        onClick={openNovoTreino}
        className="w-full relative overflow-hidden rounded-2xl border border-white/10 p-0 text-left group"
      >
        <img
          src="https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/90 to-transparent" />
        <div className="relative flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-2xl bg-[var(--lime)] flex items-center justify-center shrink-0">
            <Plus className="w-6 h-6 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-white">Criar Novo Treino</div>
            <div className="text-xs text-zinc-400">Monte uma ficha ou treine passo a passo</div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-[var(--lime)] transition-colors" />
        </div>
      </button>

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

      {novoTreinoModal && novoStep !== "exercise" && novoStep !== "completed" && novoStep !== "ficha" && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: "#0a0a0a" }}>
          {/* STEP 1: Escolha */}
          {novoStep === "choice" && (
            <div className="flex-1 flex flex-col overflow-y-auto" style={{ animation: "choiceFadeIn 0.4s ease-out" }}>
              {/* Background image */}
              <div className="fixed inset-0 z-0 pointer-events-none">
                <img
                  src="https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80"
                  alt=""
                  className="w-full h-full object-cover opacity-15"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]" />
              </div>

              {/* Header */}
              <div className="relative z-10 shrink-0 px-5 pt-5 pb-2 safe-top">
                <div className="flex items-center justify-between mb-1">
                  <div />
                  <button onClick={() => setNovoTreinoModal(false)} className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8">
                {/* Icone animado */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 rounded-full bg-[var(--lime)]/10 blur-[40px]" />
                  <div
                    className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(204,255,0,0.15), rgba(204,255,0,0.05))",
                      border: "1px solid rgba(204,255,0,0.15)",
                      animation: "choiceIconFloat 3s ease-in-out infinite",
                    }}
                  >
                    <Dumbbell className="w-9 h-9 text-[var(--lime)]" />
                  </div>
                </div>

                {/* Texto */}
                <div className="text-center mb-8 space-y-2">
                  <h1 className="text-3xl font-black text-white">Novo Treino</h1>
                  <p className="text-sm text-zinc-500 max-w-[260px] mx-auto">Como voce quer construir seu treino hoje?</p>
                </div>

                {/* Cards de escolha */}
                <div className="w-full max-w-sm space-y-3">
                  {/* Montar Ficha */}
                  <button
                    onClick={() => setNovoStep("ficha")}
                    className="w-full group relative overflow-hidden rounded-2xl border border-white/8 p-0 text-left transition-all hover:border-white/15 active:scale-[0.98]"
                  >
                    <img
                      src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80"
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/90 to-transparent" />
                    <div className="relative flex items-center gap-4 p-5">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
                        <FileText className="w-6 h-6 text-zinc-300 group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-black text-white mb-0.5">Montar Ficha</div>
                        <div className="text-xs text-zinc-400 leading-relaxed">Crie uma ficha completa com grupos musculares e exercicios personalizados</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </button>

                  {/* Passo a Passo */}
                  <button
                    onClick={() => setNovoStep("bodyparts")}
                    className="w-full group relative overflow-hidden rounded-2xl border border-[var(--lime)]/15 p-0 text-left transition-all hover:border-[var(--lime)]/30 active:scale-[0.98]"
                  >
                    <img
                      src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80"
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/90 to-transparent" />
                    <div className="absolute top-3 right-3 z-10">
                      <span className="text-[9px] font-black text-[var(--lime)] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/20">Popular</span>
                    </div>
                    <div className="relative flex items-center gap-4 p-5">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--lime)]/10 border border-[var(--lime)]/15 flex items-center justify-center shrink-0 group-hover:bg-[var(--lime)]/15 transition-colors">
                        <ListChecks className="w-6 h-6 text-[var(--lime)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-black text-white mb-0.5">Exercicio Passo a Passo</div>
                        <div className="text-xs text-zinc-400 leading-relaxed">Escolha a parte do corpo e treine um exercicio de cada vez com series e descanso</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-[var(--lime)] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {novoTreinoModal && novoStep === "ficha" && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setNovoTreinoModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#111112] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setNovoStep("choice")} className="p-1.5 rounded-lg text-zinc-500 hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-black text-white">Montar Ficha</h2>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!letra.trim()) { toast.error("Digite a letra do treino"); return; }
                  create.mutate({ data: { letra: letra.trim(), nome: nome.trim() || undefined, assigned_to: assignTo || null } });
                }}
                className="space-y-3"
              >
                <input
                  placeholder="Letra do treino (A, B, C...)"
                  value={letra}
                  onChange={e => setLetra(e.target.value.slice(0, 3))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm uppercase outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20"
                />
                <input
                  placeholder="Nome (opcional)"
                  value={nome}
                  onChange={e => setNome(e.target.value.slice(0, 80))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20"
                />
                {isTeacher && (
                  <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--lime)]/60">
                    <option value="">Para mim (pessoal)</option>
                    {myStudents.map(s => <option key={s.id} value={s.id}>Aluno: {s.nome ?? "(sem nome)"}</option>)}
                  </select>
                )}
                <button type="submit" disabled={create.isPending || !letra.trim()} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black px-5 py-3 font-bold text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {create.isPending ? <><Loader2 className="w-4 h-4 animate-spin"/> Criando...</> : <><Plus className="w-4 h-4"/> Criar Ficha</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {novoTreinoModal && novoStep === "bodyparts" && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg, #0d0d0f 0%, #0a0a0a 100%)" }}>
          {/* Header */}
          <div className="shrink-0 px-5 pt-5 pb-2 safe-top">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => setNovoStep("choice")} className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setNovoTreinoModal(false)} className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto px-6 pb-8">
            {/* Titulo */}
            <div className="text-center mb-6 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/15 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] animate-pulse" />
                <span className="text-[10px] font-black text-[var(--lime)] uppercase tracking-widest">Passo a Passo</span>
              </div>
              <h1 className="text-2xl font-black text-white">Qual parte do corpo?</h1>
              <p className="text-sm text-zinc-500">Escolha o grupo muscular para treinar</p>
            </div>

            {/* Grid de partes do corpo */}
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full">
              {BODY_PARTS.map((bp, i) => (
                <button
                  key={bp.key}
                  onClick={() => startPassoAPasso(bp.key)}
                  className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] text-left transition-all hover:border-[var(--lime)]/30 active:scale-[0.97]"
                  style={{ animation: `choiceCardIn 0.4s ease-out ${i * 0.05}s both` }}
                >
                  {/* Imagem de fundo */}
                  <div className="relative w-full aspect-square overflow-hidden">
                    <img
                      src={bp.img}
                      alt={bp.label}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    {/* Overlay gradiente */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${bp.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    {/* Glow verde no hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: "inset 0 0 30px rgba(204,255,0,0.1)" }} />
                    {/* Label */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white drop-shadow-lg">{bp.label}</span>
                        <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-[var(--lime)]/20 group-hover:border-[var(--lime)]/30 transition-all">
                          <ChevronRight className="w-3.5 h-3.5 text-white/60 group-hover:text-[var(--lime)] transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes choiceFadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes choiceIconFloat {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-6px); }
            }
            @keyframes choiceCardIn {
              from { opacity: 0; transform: translateY(16px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}

      {/* TELA CHEIA: Exerc\u00EDcio Passo a Passo */}
      {novoTreinoModal && novoStep === "exercise" && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="shrink-0 px-4 pt-4 pb-2 safe-top">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setNovoStep("bodyparts")} className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] animate-pulse" />
                <span className="text-[10px] font-black text-[var(--lime)] uppercase tracking-widest">{BODYPART_PT[selectedBodyPart] ?? selectedBodyPart}</span>
              </div>
              <button onClick={() => { setNovoTreinoModal(false); if (restRef.current) clearInterval(restRef.current); setRestTimer({ active: false, seconds: 0, total: 0 }); }} className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Barra de progresso */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-[var(--lime)] tabular-nums">{exerciseIndex + 1}/{exerciseList.length}</span>
              <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: exerciseList.length > 0 ? `${((exerciseIndex + 1) / exerciseList.length) * 100}%` : "0%",
                    background: "linear-gradient(90deg, var(--lime), #c8ff33)",
                  }}
                />
              </div>
            </div>
            {/* Dots */}
            <div className="flex justify-center gap-0.5 mt-2.5">
              {exerciseList.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    completedExercises.has(i)
                      ? "w-1.5 h-1.5 bg-[var(--lime)]"
                      : i === exerciseIndex
                        ? "w-5 h-1.5 bg-[var(--lime)]"
                        : "w-1.5 h-1.5 bg-white/15"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Conteudo */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 overflow-y-auto min-h-0">
            {loadingExercises ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-[var(--lime)] animate-spin" />
                  <Dumbbell className="w-8 h-8 text-[var(--lime)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <span className="text-sm font-bold text-zinc-500 animate-pulse">Carregando exerc\u00EDcios...</span>
              </div>
            ) : restTimer.active ? (
              /* TIMER DE DESCANSO */
              <div className="w-full max-w-sm flex flex-col items-center gap-6" style={{ animation: "exerciseFadeIn 0.4s ease-out" }}>
                <div className="text-center space-y-2">
                  <div className="flex items-center gap-2 justify-center">
                    <Pause className="w-5 h-5 text-[var(--lime)]" />
                    <span className="text-sm font-black text-[var(--lime)] uppercase tracking-widest">Descanso</span>
                  </div>
                  <p className="text-xs text-zinc-500">Respire e se prepare para a pr\u00F3xima serie</p>
                </div>

                {/* Timer circular */}
                <div className="relative w-44 h-44">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle
                      cx="50" cy="50" r="44" fill="none"
                      stroke="url(#timerGrad)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 44}`}
                      strokeDashoffset={`${2 * Math.PI * 44 * (1 - restTimer.seconds / restTimer.total)}`}
                      className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                    />
                    <defs>
                      <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--lime)" />
                        <stop offset="100%" stopColor="#c8ff33" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-white tabular-nums" style={{ animation: "popIn 0.3s ease-out" }}>{restTimer.seconds}</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">segundos</span>
                  </div>
                </div>

                {/* Info da serie */}
                <div className="w-full rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-center mb-3">
                    <span className="text-xs text-zinc-500">Pr\u00F3xima: </span>
                    <span className="text-xs font-black text-white capitalize">{currentExercise?.name}</span>
                  </div>
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <div className="text-lg font-black text-[var(--lime)]">{getExerciseConfig(exerciseIndex).sets - (currentSet - 1)}x</div>
                      <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Series restantes</div>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center">
                      <div className="text-lg font-black text-white">{getExerciseConfig(exerciseIndex).reps}</div>
                      <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Repeticoes</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { if (restRef.current) clearInterval(restRef.current); setRestTimer({ active: false, seconds: 0, total: 0 }); }}
                  className="w-full rounded-2xl px-4 py-3.5 text-sm font-black text-black bg-white/10 border border-white/10 hover:bg-white/15 active:scale-95 transition-all"
                >
                  Pular Descanso
                </button>
              </div>
            ) : !currentExercise ? (
              <div className="text-center text-zinc-500 text-sm">Nenhum exerc\u00EDcio encontrado.</div>
            ) : (
              <div className="w-full max-w-sm space-y-4" style={{ animation: "exerciseFadeIn 0.4s ease-out" }} key={`exercise-${exerciseIndex}-set-${currentSet}`}>
                {/* GIF do exercicio */}
                <div className="relative mx-auto w-full max-w-[280px]">
                  <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-br from-[var(--lime)]/15 via-transparent to-[var(--lime)]/5 blur-sm" />
                  <div className="relative rounded-2xl bg-white/95 overflow-hidden shadow-[0_20px_60px_-15px_rgba(204,255,0,0.15)]">
                    <img
                      key={exerciseIndex}
                      src={currentExercise.gifUrl}
                      alt={currentExercise.name}
                      className="w-full aspect-square object-contain"
                      style={{ animation: "exerciseFadeIn 0.4s ease-out" }}
                    />
                    {/* Badge de serie */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] animate-pulse" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        Serie {currentSet} de {getExerciseConfig(exerciseIndex).sets}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info do exercicio */}
                <div className="text-center space-y-2.5">
                  <h3
                    key={`name-${exerciseIndex}-${currentSet}`}
                    className="text-xl font-black text-white capitalize"
                    style={{ animation: "exerciseFadeIn 0.5s ease-out" }}
                  >
                    {currentExercise.name}
                  </h3>
                  <div className="flex justify-center flex-wrap gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--lime)]/12 text-[var(--lime)] border border-[var(--lime)]/20">
                      {currentExercise.target}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/8">
                      {currentExercise.equipment}
                    </span>
                  </div>
                </div>

                {/* Config de series/reps */}
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold text-center mb-3">Configuracao</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-black text-white">{getExerciseConfig(exerciseIndex).sets}</div>
                      <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Series</div>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-black text-[var(--lime)]">{getExerciseConfig(exerciseIndex).reps}</div>
                      <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Reps</div>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-black text-white">{getExerciseConfig(exerciseIndex).rest}s</div>
                      <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Descanso</div>
                    </div>
                  </div>
                  {/* Progresso das series */}
                  <div className="flex justify-center gap-1.5 mt-3">
                    {Array.from({ length: getExerciseConfig(exerciseIndex).sets }).map((_, s) => (
                      <div
                        key={s}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          s < currentSet - 1
                            ? "w-5 bg-[var(--lime)]"
                            : s === currentSet - 1
                              ? "w-5 bg-[var(--lime)]"
                              : "w-5 bg-white/10"
                        }`}
                        style={s === currentSet - 1 ? { boxShadow: "0 0 8px rgba(204,255,0,0.4)" } : {}}
                      />
                    ))}
                  </div>
                </div>

                {/* Contador visual */}
                <div className="flex items-center justify-center gap-5 py-1">
                  <div className="text-center">
                    <div className="text-2xl font-black text-[var(--lime)] tabular-nums" style={{ animation: "popIn 0.3s ease-out" }}>
                      {exerciseIndex + 1}
                    </div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Exercicio</div>
                  </div>
                  <div className="w-px h-8 bg-white/8" />
                  <div className="text-center">
                    <div className="text-2xl font-black text-white tabular-nums">{exerciseList.length}</div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Total</div>
                  </div>
                  <div className="w-px h-8 bg-white/8" />
                  <div className="text-center">
                    <div className="text-2xl font-black text-[var(--lime)] tabular-nums">
                      {Math.round(((exerciseIndex + 1) / exerciseList.length) * 100)}%
                    </div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Feito</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botoes */}
          {!restTimer.active && !loadingExercises && currentExercise && (
            <div className="shrink-0 px-4 pb-5 safe-bottom">
              <div className="flex gap-3 max-w-sm mx-auto">
                <button
                  onClick={() => { if (exerciseIndex > 0) { setExerciseIndex(exerciseIndex - 1); setCurrentSet(1); } }}
                  disabled={exerciseIndex === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/8 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-0 disabled:pointer-events-none hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ArrowLeft className="w-4 h-4"/>
                </button>
                <button
                  onClick={advanceSet}
                  className="flex-1 inline-flex items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-black text-black active:scale-[0.97] transition-all"
                  style={{
                    background: "linear-gradient(135deg, var(--lime), #c8ff33)",
                    boxShadow: "0 8px 30px -5px rgba(204,255,0,0.35)",
                  }}
                >
                  {currentSet < getExerciseConfig(exerciseIndex).sets ? (
                    <><Play className="w-5 h-5" fill="currentColor"/> Concluir Serie {currentSet}</>
                  ) : exerciseIndex < exerciseList.length - 1 ? (
                    <><SkipForward className="w-5 h-5"/> Proximo Exercicio</>
                  ) : (
                    <><Flag className="w-5 h-5"/> Finalizar Treino</>
                  )}
                </button>
              </div>
            </div>
          )}

          <style>{`
            @keyframes exerciseFadeIn {
              from { opacity: 0; transform: translateY(10px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes popIn {
              0% { transform: scale(0.6); opacity: 0; }
              70% { transform: scale(1.08); }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* TELA CHEIA: Treino Concluido */}
      {novoTreinoModal && novoStep === "completed" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center overflow-hidden" style={{ background: "linear-gradient(180deg, #0d0d0f 0%, #0a0a0a 50%, #0a0f0a 100%)" }}>
          {/* Confetti */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-5%`,
                  width: `${4 + Math.random() * 6}px`,
                  height: `${4 + Math.random() * 6}px`,
                  borderRadius: i % 3 === 0 ? "50%" : i % 3 === 1 ? "2px" : "0",
                  background: ["var(--lime)", "#c8ff33", "#FFD400", "#fff", "#22c55e", "#84cc16", "#facc15"][i % 7],
                  animation: `confettiFall ${2.5 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
                  opacity: 0.85,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>

          {/* Glows de fundo */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(204,255,0,0.12), transparent)" }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[80px]" style={{ background: "radial-gradient(circle, rgba(204,255,0,0.06), transparent)" }} />

          <div className="relative space-y-7 max-w-sm w-full">
            {/* Trofeu */}
            <div className="relative mx-auto w-36 h-36">
              <div className="absolute inset-0 rounded-full bg-[var(--lime)]/20 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-2 rounded-full bg-[var(--lime)]/10 animate-pulse" />
              <div className="absolute inset-4 rounded-full bg-[var(--lime)]/5 animate-pulse" style={{ animationDelay: "0.5s" }} />
              <div
                className="relative w-36 h-36 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--lime), #c8ff33, #a8d400)",
                  boxShadow: "0 0 80px -15px rgba(204,255,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3)",
                  animation: "trophyPulse 2s ease-in-out infinite",
                }}
              >
                <span className="text-7xl drop-shadow-lg" style={{ animation: "popIn 0.5s ease-out 0.3s both" }}>{'\u{1F3C6}'}</span>
              </div>
            </div>

            {/* Texto */}
            <div className="space-y-3">
              <h1
                className="text-5xl font-black text-transparent bg-clip-text"
                style={{
                  backgroundImage: "linear-gradient(135deg, var(--lime), #c8ff33, #fff, var(--lime))",
                  backgroundSize: "200% auto",
                  animation: "gradientShift 3s ease infinite, completionFadeUp 0.7s ease-out 0.2s both",
                }}
              >
                INCRIVEL!
              </h1>
              <p
                className="text-xl font-black text-white"
                style={{ animation: "completionFadeUp 0.7s ease-out 0.3s both" }}
              >
                Treino Concluido!
              </p>
              <p
                className="text-sm text-zinc-500 leading-relaxed"
                style={{ animation: "completionFadeUp 0.7s ease-out 0.4s both" }}
              >
                Voce completou todos os{' '}
                <span className="font-black text-[var(--lime)]">{exerciseList.length} exercicios</span>{' '}
                de <span className="font-black text-white">{BODYPART_PT[selectedBodyPart] ?? selectedBodyPart}</span>
              </p>
            </div>

            {/* Cards de resumo */}
            <div
              className="grid grid-cols-3 gap-3"
              style={{ animation: "completionFadeUp 0.7s ease-out 0.5s both" }}
            >
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-1.5">
                <div className="w-9 h-9 rounded-full bg-[var(--lime)]/12 text-[var(--lime)] flex items-center justify-center mx-auto">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-white">{exerciseList.length}</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Exercicios</div>
              </div>
              <div className="rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/5 p-4 space-y-1.5">
                <div className="w-9 h-9 rounded-full bg-[var(--lime)]/20 text-[var(--lime)] flex items-center justify-center mx-auto">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-[var(--lime)]">100%</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Progresso</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-1.5">
                <div className="w-9 h-9 rounded-full bg-orange-500/12 text-orange-400 flex items-center justify-center mx-auto">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-white">{exerciseList.length}</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Series</div>
              </div>
            </div>

            {/* Detalhes do treino */}
            <div
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-4"
              style={{ animation: "completionFadeUp 0.7s ease-out 0.6s both" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Resumo</span>
                <div className="flex items-center gap-1 text-[var(--lime)]">
                  <Flame className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Finalizado</span>
                </div>
              </div>
              <div className="space-y-3">
                {exerciseList.map((ex, i) => {
                  const cfg = getExerciseConfig(i);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center text-[10px] font-black">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white capitalize truncate">{ex.name}</div>
                        <div className="text-[10px] text-zinc-500">{cfg.sets}x{cfg.reps} \u00B7 {cfg.rest}s descanso</div>
                      </div>
                      <div className="text-[var(--lime)]">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Barra de progresso */}
            <div
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              style={{ animation: "completionFadeUp 0.7s ease-out 0.7s both" }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Progresso total</span>
                <span className="text-xs font-black text-[var(--lime)]">100%</span>
              </div>
              <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "100%",
                    background: "linear-gradient(90deg, var(--lime), #c8ff33, var(--lime))",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s linear infinite",
                  }}
                />
              </div>
            </div>

            {/* Botoes */}
            <div
              className="flex gap-3"
              style={{ animation: "completionFadeUp 0.7s ease-out 0.8s both" }}
            >
              <button
                onClick={() => { setNovoTreinoModal(false); setNovoStep("choice"); }}
                className="flex-1 rounded-2xl px-5 py-4 font-black text-sm text-black active:scale-[0.97] transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--lime), #c8ff33)",
                  boxShadow: "0 8px 30px -5px rgba(204,255,0,0.35)",
                }}
              >
                Voltar ao Inicio
              </button>
              <button
                onClick={() => { setNovoStep("bodyparts"); setExerciseIndex(0); setCurrentSet(1); setCompletedExercises(new Set()); setRestTimer({ active: false, seconds: 0, total: 0 }); }}
                className="rounded-2xl px-5 py-4 font-black text-sm text-white bg-white/5 border border-white/8 hover:bg-white/10 active:scale-[0.97] transition-all"
              >
                <RotateCcw className="w-5 h-5" />
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
      )}
    </div>
  );
}

function VincularAlunoSection({ studentsQO }: { studentsQO: () => any }) {
  const qc = useQueryClient();
  const { data: myStudents } = useSuspenseQuery(studentsQO());
  const [email, setEmail] = useState("");
  const [searchResult, setSearchResult] = useState<{ id: string; nome: string | null } | null>(null);
  const [searching, setSearching] = useState(false);

  const search = useMutation({
    mutationFn: useServerFn(searchUserByEmail),
    onSuccess: (data) => { setSearchResult(data); setSearching(false); },
    onError: (e) => { toast.error(e.message); setSearching(false); setSearchResult(null); },
  });

  const link = useMutation({
    mutationFn: useServerFn(linkStudent),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myStudents"] });
      toast.success("Aluno vinculado com sucesso!");
      setEmail("");
      setSearchResult(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSearch = () => {
    if (!email.trim()) return;
    setSearching(true);
    setSearchResult(null);
    search.mutate({ data: { email: email.trim() } });
  };

  const alreadyLinked = searchResult ? myStudents.some((s: any) => s.id === searchResult.id) : false;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111112] p-5 sm:p-6">
      <img
        src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-10"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/95 to-[#111112]/80" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-[var(--lime)]" />
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Vincular Aluno</h2>
        </div>

        <p className="text-xs text-zinc-500 mb-3">
          Ja tem um aluno cadastrado? Vincule pelo email para criar fichas para ele.
        </p>

        <div className="flex gap-2">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Email do aluno"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-600"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !email.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] text-black px-4 py-2.5 font-bold text-sm hover:brightness-110 disabled:opacity-60 transition-all shrink-0"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Buscar
          </button>
        </div>

        {searchResult && (
          <div className="mt-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{searchResult.nome ?? "(sem nome)"}</div>
              <div className="text-[11px] text-zinc-500">{email}</div>
            </div>
            {alreadyLinked ? (
              <span className="text-[11px] font-bold text-[var(--lime)] bg-[var(--lime)]/10 px-3 py-1 rounded-lg">Ja vinculado</span>
            ) : (
              <button
                onClick={() => link.mutate({ data: { student_id: searchResult.id } })}
                disabled={link.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--lime)] text-black px-3 py-1.5 text-xs font-bold hover:brightness-110 disabled:opacity-60 transition-all"
              >
                {link.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Vincular
              </button>
            )}
          </div>
        )}

        {myStudents.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Alunos vinculados</div>
            <div className="flex flex-wrap gap-2">
              {myStudents.map((s: any) => (
                <div key={s.id} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1.5 text-xs font-semibold text-[var(--lime)]">
                  <Users className="w-3 h-3" />
                  {s.nome ?? "(sem nome)"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
