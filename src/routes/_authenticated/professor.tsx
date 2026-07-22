import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import {
  queryOptions,
  useSuspenseQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listMyStudents, getMyRole, createStudent, searchUserByEmail, linkStudent } from "@/lib/roles.functions";
import {
  listWorkoutsForStudent, createWorkout, deleteWorkout, updateWorkout,
  listWorkouts, createWorkoutWithExercises,
} from "@/lib/workouts.functions";
import { searchExercises, BODYPART_PT, TARGET_PT, EQUIPMENT_PT, ptTerm, type Exercise } from "@/lib/exercisedb.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Play, Users, Dumbbell, Search,
  UserPlus, ChevronRight, Pencil, BookOpen, CheckCircle2, X,
  FileText, ListChecks, Loader2, Flag, RotateCcw, TrendingUp,
  Flame, Check,
} from "lucide-react";

const studentsQO = () =>
  queryOptions({ queryKey: ["myStudents"], queryFn: () => listMyStudents() });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });

export const Route = createFileRoute("/_authenticated/professor")({
  loader: async ({ context }) => {
    const r = await context.queryClient.ensureQueryData(roleQO());
    if (r.role !== "admin" && r.role !== "professor") throw redirect({ to: "/app" });
    context.queryClient.ensureQueryData(studentsQO());
  },
  component: ProfessorPage,
});

function ProfessorPage() {
  const { data: students } = useSuspenseQuery(studentsQO());
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && students.length > 0) setSelected(students[0].id);
  }, [students, selected]);

  useEffect(() => {
    const channel = supabase.channel("presence:professores", {
      config: { presence: { key: "user" } },
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const { data } = await supabase.auth.getUser();
        if (data.user) await channel.track({ user_id: data.user.id });
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, []);

  const selectedStudent = students.find((s) => s.id === selected);

  return (
    <div className="min-h-screen bg-[#111112] text-white">
      {/* Header */}
      <header className="bg-black/80 border-b border-white/10 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate({ to: "/app" })} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black uppercase tracking-widest text-[var(--lime)]">Meus Alunos</h1>
            <p className="text-[11px] text-zinc-500">{students.length} aluno{students.length !== 1 ? "s" : ""} vinculado{students.length !== 1 ? "s" : ""}</p>
          </div>
          <Link to="/app" className="inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] text-black px-4 py-2 text-xs font-bold hover:brightness-110 transition-all">
            <Dumbbell className="w-4 h-4" />
            Painel
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 grid gap-4 lg:grid-cols-[320px_1fr] min-h-[calc(100vh-56px)]">
        {/* Sidebar - students list */}
        <aside className="space-y-4">
          <LinkStudentSection studentsQO={studentsQO} />
          <StudentList students={students} selected={selected} onSelect={setSelected} />
        </aside>

        {/* Main content - selected student workouts */}
        <section>
          {selected && selectedStudent ? (
            <StudentPanel studentId={selected} studentName={selectedStudent.nome ?? "(sem nome)"} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#111112] p-12 text-center">
              <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">
                {students.length === 0
                  ? "Nenhum aluno vinculado. Vincule um aluno pelo email acima."
                  : "Selecione um aluno para gerenciar."}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ─── Link Student Section ─── */
function LinkStudentSection({ studentsQO: sqo }: { studentsQO: () => any }) {
  const qc = useQueryClient();
  const { data: myStudents } = useSuspenseQuery(sqo()) as { data: Array<{ id: string; nome: string | null }> };
  const [email, setEmail] = useState("");
  const [searchResult, setSearchResult] = useState<{ id: string; nome: string | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useMutation({
    mutationFn: useServerFn(searchUserByEmail),
    onSuccess: (data) => { setSearchResult(data as { id: string; nome: string | null }); setSearching(false); },
    onError: (e) => { toast.error(e.message); setSearching(false); setSearchResult(null); },
  });

  const link = useMutation({
    mutationFn: useServerFn(linkStudent),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myStudents"] });
      toast.success("Aluno vinculado!");
      setEmail("");
      setSearchResult(null);
      setOpen(false);
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
    <div className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-[var(--lime)]/10 flex items-center justify-center shrink-0">
          <UserPlus className="w-4 h-4 text-[var(--lime)]" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-bold text-white">Vincular Aluno</div>
          <div className="text-[11px] text-zinc-500">Aluno ja cadastrado? Busque pelo email</div>
        </div>
        <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Email do aluno"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-600"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !email.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] text-black px-4 py-2.5 font-bold text-xs hover:brightness-110 disabled:opacity-60 transition-all shrink-0"
            >
              {searching ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>

          {searchResult && (
            <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--lime)]/20 flex items-center justify-center text-[var(--lime)] font-bold text-sm shrink-0">
                {(searchResult.nome ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{searchResult.nome ?? "(sem nome)"}</div>
                <div className="text-[11px] text-zinc-500 truncate">{email}</div>
              </div>
              {alreadyLinked ? (
                <span className="text-[11px] font-bold text-[var(--lime)] bg-[var(--lime)]/10 px-3 py-1 rounded-lg">Vinculado</span>
              ) : (
                <button
                  onClick={() => link.mutate({ data: { student_id: searchResult.id } })}
                  disabled={link.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--lime)] text-black px-3 py-1.5 text-xs font-bold hover:brightness-110 disabled:opacity-60 transition-all"
                >
                  {link.isPending ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Plus className="w-3 h-3" />}
                  Vincular
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Student List ─── */
function StudentList({ students, selected, onSelect }: { students: any[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5">
        <div className="w-1 h-4 rounded-full bg-[var(--lime)]" />
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Alunos</h2>
      </div>
      {students.length === 0 ? (
        <div className="p-6 text-center text-sm text-zinc-500">Nenhum aluno ainda.</div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0 ${
                selected === s.id
                  ? "bg-[var(--lime)]/10"
                  : "hover:bg-white/[0.02]"
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                selected === s.id
                  ? "bg-[var(--lime)] text-black"
                  : "bg-white/10 text-zinc-400"
              }`}>
                {(s.nome ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${selected === s.id ? "text-[var(--lime)]" : "text-white"}`}>
                  {s.nome ?? "(sem nome)"}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">{s.email ?? ""}</div>
              </div>
              {selected === s.id && <CheckCircle2 className="w-4 h-4 text-[var(--lime)] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

/* ─── Student Panel ─── */
function StudentPanel({ studentId, studentName }: { studentId: string; studentName: string }) {
  const qc = useQueryClient();
  const { data: workouts = [] } = useQuery({
    queryKey: ["studentWorkouts", studentId],
    queryFn: () => listWorkoutsForStudent({ data: { student_id: studentId } }),
  });
  const [showAssign, setShowAssign] = useState(false);
  const [assignStep, setAssignStep] = useState<"choice" | "ficha" | "bodyparts" | "passo" | "review" | "completed">("choice");
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Array<{ exercise: Exercise; sets: number; reps: number }>>([]);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [passoLetra, setPassoLetra] = useState("");
  const [passoNome, setPassoNome] = useState("");

  const del = useMutation({
    mutationFn: useServerFn(deleteWorkout),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studentWorkouts", studentId] });
      qc.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Ficha excluida");
    },
  });

  const assignWorkout = useMutation({
    mutationFn: useServerFn(updateWorkout),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studentWorkouts", studentId] });
      qc.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Ficha atribuida com sucesso!");
      setShowAssign(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const createPasso = useMutation({
    mutationFn: useServerFn(createWorkoutWithExercises),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["studentWorkouts", studentId] });
      qc.invalidateQueries({ queryKey: ["workouts"] });
      const r = data as { id: string; letra: string };
      toast.success(`Treino ${r.letra} criado e atribuido a ${studentName}!`);
      setAssignStep("completed");
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: allWorkouts } = useQuery({
    queryKey: ["allWorkouts"],
    queryFn: () => listWorkouts(),
    enabled: showAssign && assignStep === "ficha",
  });

  const startFichaAssign = () => setAssignStep("ficha");

  const startPassoAPasso = async (bodyPart: string) => {
    setSelectedBodyPart(bodyPart);
    setAssignStep("passo");
    setLoadingExercises(true);
    setCurrentExerciseIdx(0);
    setSelectedExercises([]);
    try {
      const exercises = await searchExercises({ data: { bodyPart, limit: 30, offset: 0 } });
      setExerciseList(exercises);
      setCurrentExerciseIdx(0);
    } catch {
      toast.error("Erro ao carregar exercicios. Verifique a API.");
      setExerciseList([]);
    }
    setLoadingExercises(false);
  };

  const addCurrentExercise = (sets: number, reps: number) => {
    const ex = exerciseList[currentExerciseIdx];
    if (!ex) return;
    setSelectedExercises(prev => [...prev, { exercise: ex, sets, reps }]);
    if (currentExerciseIdx < exerciseList.length - 1) {
      setCurrentExerciseIdx(currentExerciseIdx + 1);
    } else {
      setAssignStep("review");
    }
  };

  const removeSelectedExercise = (idx: number) => {
    setSelectedExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const finishPasso = () => {
    if (!passoLetra.trim()) { toast.error("Digite a letra do treino"); return; }
    if (selectedExercises.length === 0) { toast.error("Selecione pelo menos um exercicio"); return; }
    createPasso.mutate({
      data: {
        letra: passoLetra.trim(),
        nome: passoNome.trim() || undefined,
        assigned_to: studentId,
        body_part_label: BODYPART_PT[selectedBodyPart] ?? selectedBodyPart,
        exercises: selectedExercises.map(ex => ({
          exercise_db_id: ex.exercise.id.toString(),
          nome: ex.exercise.name,
          sets: ex.sets,
          reps: ex.reps,
        })),
      },
    });
  };

  const openAssign = () => {
    setShowAssign(true);
    setAssignStep("choice");
    setSelectedBodyPart("");
    setExerciseList([]);
    setSelectedExercises([]);
    setCurrentExerciseIdx(0);
    setPassoLetra("");
    setPassoNome("");
  };

  return (
    <div className="space-y-4">
      {/* Student Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111112]">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/90 to-[#111112]/60" />
        <div className="relative p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[var(--lime)] flex items-center justify-center text-black font-black text-xl shrink-0">
            {studentName[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white">{studentName}</h2>
            <p className="text-xs text-zinc-400">{workouts.length} ficha{workouts.length !== 1 ? "s" : ""} atribuida{workouts.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Atribuir Treino button */}
      <button
        onClick={openAssign}
        className="w-full relative overflow-hidden rounded-2xl border border-[var(--lime)]/30 bg-[var(--lime)]/5 p-5 text-left group hover:bg-[var(--lime)]/10 transition-all"
      >
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--lime)] flex items-center justify-center shrink-0">
            <Plus className="w-6 h-6 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-black text-white">Atribuir Treino</div>
            <div className="text-xs text-zinc-400">Ficha ou passo a passo para {studentName}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-[var(--lime)] transition-colors shrink-0" />
        </div>
      </button>

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: "#0a0a0a" }}>
          {/* Background */}
          <div className="fixed inset-0 z-0 pointer-events-none">
            <img
              src="https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80"
              alt=""
              className="w-full h-full object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]" />
          </div>

          {/* Header */}
          <div className="relative z-10 shrink-0 px-5 pt-5 pb-2 safe-top">
            <div className="flex items-center justify-between mb-1">
              {assignStep !== "choice" && assignStep !== "completed" ? (
                <button
                  onClick={() => setAssignStep("choice")}
                  className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : <div />}
              <button
                onClick={() => { setShowAssign(false); setAssignStep("choice"); }}
                className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Step: Choice */}
          {assignStep === "choice" && (
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8">
              <div className="relative mb-8">
                <div className="absolute inset-0 rounded-full bg-[var(--lime)]/10 blur-[40px]" />
                <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(204,255,0,0.15), rgba(204,255,0,0.05))", border: "1px solid rgba(204,255,0,0.15)" }}>
                  <Dumbbell className="w-9 h-9 text-[var(--lime)]" />
                </div>
              </div>
              <div className="text-center mb-8 space-y-2">
                <h1 className="text-3xl font-black text-white">Atribuir Treino</h1>
                <p className="text-sm text-zinc-500 max-w-[260px] mx-auto">Como quer atribuir o treino para {studentName}?</p>
              </div>
              <div className="w-full max-w-sm space-y-3">
                <button
                  onClick={startFichaAssign}
                  className="w-full group relative overflow-hidden rounded-2xl border border-white/8 p-0 text-left transition-all hover:border-white/15 active:scale-[0.98]"
                >
                  <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/90 to-transparent" />
                  <div className="relative flex items-center gap-4 p-5">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
                      <FileText className="w-6 h-6 text-zinc-300 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-black text-white mb-0.5">Ficha</div>
                      <div className="text-xs text-zinc-400 leading-relaxed">Atribuir uma ficha existente</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </button>

                <button
                  onClick={() => setAssignStep("bodyparts")}
                  className="w-full group relative overflow-hidden rounded-2xl border border-[var(--lime)]/15 p-0 text-left transition-all hover:border-[var(--lime)]/30 active:scale-[0.98]"
                >
                  <img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/90 to-transparent" />
                  <div className="relative flex items-center gap-4 p-5">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--lime)]/10 border border-[var(--lime)]/15 flex items-center justify-center shrink-0 group-hover:bg-[var(--lime)]/15 transition-colors">
                      <ListChecks className="w-6 h-6 text-[var(--lime)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-black text-white mb-0.5">Passo a Passo</div>
                      <div className="text-xs text-zinc-400 leading-relaxed">Escolher exercicios um por um da biblioteca</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-[var(--lime)] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step: Ficha - list existing workouts */}
          {assignStep === "ficha" && (
            <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-8">
              <h2 className="text-xl font-black text-white text-center mb-6">Selecione uma ficha</h2>
              {!allWorkouts || allWorkouts.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">Nenhuma ficha encontrada. Crie uma primeiro.</div>
              ) : (
                <div className="max-w-sm mx-auto space-y-2">
                  {allWorkouts.map((w) => (
                    <div key={w.id} className="rounded-2xl border border-white/10 bg-[#111112] flex items-center gap-3 p-4 overflow-hidden group hover:border-[var(--lime)]/40 transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--lime)] text-black font-black text-xl flex items-center justify-center shrink-0">
                        {w.letra}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white">Treino {w.letra}</div>
                        {w.nome && <div className="text-xs text-zinc-500 truncate">{w.nome}</div>}
                        <div className="text-[11px] text-zinc-600">
                          {w.assigned_nome ? `Atribuido a: ${w.assigned_nome}` : "Pessoal"}
                        </div>
                      </div>
                      <button
                        onClick={() => assignWorkout.mutate({ data: { id: w.id, assigned_to: studentId } })}
                        disabled={assignWorkout.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--lime)] text-black px-3 py-2 text-xs font-bold hover:brightness-110 disabled:opacity-60 transition-all shrink-0"
                      >
                        {assignWorkout.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Atribuir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Bodyparts */}
          {assignStep === "bodyparts" && (
            <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-8">
              <div className="text-center mb-6 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/15 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] animate-pulse" />
                  <span className="text-[10px] font-black text-[var(--lime)] uppercase tracking-widest">Passo a Passo</span>
                </div>
                <h1 className="text-2xl font-black text-white">Qual parte do corpo?</h1>
                <p className="text-sm text-zinc-500">Escolha o grupo muscular para os exercicios</p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full">
                {BODY_PARTS.map((bp, i) => (
                  <button
                    key={bp.key}
                    onClick={() => startPassoAPasso(bp.key)}
                    className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] text-left transition-all hover:border-[var(--lime)]/30 active:scale-[0.97]"
                  >
                    <div className="relative w-full aspect-square overflow-hidden">
                      <img src={bp.img} alt={bp.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      <div className={`absolute inset-0 bg-gradient-to-br ${bp.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: "inset 0 0 30px rgba(204,255,0,0.1)" }} />
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
          )}

          {/* Step: Passo a passo - exercise selection */}
          {assignStep === "passo" && (
            <div className="relative z-10 flex-1 flex flex-col px-4 pb-6">
              {/* Progress */}
              {!loadingExercises && exerciseList.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-[var(--lime)] shrink-0">
                    {selectedExercises.length + (currentExerciseIdx < exerciseList.length ? 0 : 0)}/{exerciseList.length}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 bg-[var(--lime)]" style={{ width: `${((selectedExercises.length) / Math.max(1, exerciseList.length)) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-white/60 shrink-0">{Math.round((selectedExercises.length / Math.max(1, exerciseList.length)) * 100)}%</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black text-[var(--lime)] uppercase tracking-widest">{BODYPART_PT[selectedBodyPart] ?? selectedBodyPart}</span>
                <span className="text-xs text-zinc-500">- Selecione os exercicios</span>
              </div>

              {/* Selected count */}
              {selectedExercises.length > 0 && (
                <button
                  onClick={() => setAssignStep("review")}
                  className="mb-3 inline-flex items-center gap-2 rounded-xl bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-2 text-xs font-bold text-[var(--lime)] hover:bg-[var(--lime)]/20 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedExercises.length} exercicio{selectedExercises.length !== 1 ? "s" : ""} selecionado{selectedExercises.length !== 1 ? "s" : ""} - Revisar
                </button>
              )}

              {/* Current exercise */}
              {loadingExercises ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-[var(--lime)] animate-spin" />
                    <span className="text-sm font-bold text-zinc-500 animate-pulse">Carregando exercicios...</span>
                  </div>
                </div>
              ) : exerciseList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Nenhum exercicio encontrado.</div>
              ) : currentExerciseIdx < exerciseList.length ? (
                <div className="flex-1 flex flex-col items-center justify-center" key={`ex-${currentExerciseIdx}`}>
                  <div className="w-full max-w-sm space-y-5">
                    <div className="relative mx-auto w-full max-w-[220px]">
                      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-[var(--lime)]/10 via-transparent to-[var(--lime)]/5 blur-sm" />
                      <div className="relative rounded-2xl bg-white/95 overflow-hidden">
                        <img src={exerciseList[currentExerciseIdx].gifUrl} alt={exerciseList[currentExerciseIdx].name} className="w-full aspect-square object-contain" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-black text-white capitalize">{exerciseList[currentExerciseIdx].name}</h3>
                      <div className="flex justify-center flex-wrap gap-2 mt-2">
                        <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[var(--lime)]/12 text-[var(--lime)] border border-[var(--lime)]/20">{ptTerm(TARGET_PT, exerciseList[currentExerciseIdx].target) ?? exerciseList[currentExerciseIdx].target}</span>
                        <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/10">{ptTerm(EQUIPMENT_PT, exerciseList[currentExerciseIdx].equipment) ?? exerciseList[currentExerciseIdx].equipment}</span>
                      </div>
                    </div>
                    <PassoConfigurator
                      key={`cfg-${currentExerciseIdx}`}
                      exercise={exerciseList[currentExerciseIdx]}
                      exerciseIndex={currentExerciseIdx}
                      onAdd={(sets, reps) => addCurrentExercise(sets, reps)}
                      onSkip={() => {
                        if (currentExerciseIdx < exerciseList.length - 1) setCurrentExerciseIdx(currentExerciseIdx + 1);
                        else setAssignStep("review");
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-zinc-500">Todos exercicios vistos. Clique em Revisar.</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Review */}
          {assignStep === "review" && (
            <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-8">
              <div className="max-w-sm mx-auto space-y-5">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black text-white">Revisar Exercicios</h2>
                  <p className="text-sm text-zinc-500">{selectedExercises.length} exercicio{selectedExercises.length !== 1 ? "s" : ""} selecionado{selectedExercises.length !== 1 ? "s" : ""}</p>
                </div>

                {/* Selected exercises list */}
                <div className="space-y-2">
                  {selectedExercises.map((item, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-[#111112] p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--lime)]/10 flex items-center justify-center text-[var(--lime)] font-black text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate capitalize">{item.exercise.name}</div>
                        <div className="text-[11px] text-zinc-500">{item.sets}x{item.reps} repeticoes</div>
                      </div>
                      <button
                        onClick={() => removeSelectedExercise(i)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Voltar para adicionar mais */}
                <button
                  onClick={() => setAssignStep("passo")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-zinc-400 px-4 py-3 text-sm font-bold hover:border-[var(--lime)]/40 hover:text-[var(--lime)] transition-all"
                >
                  <Plus className="w-4 h-4" /> Adicionar mais exercicios
                </button>

                {/* Letra + Nome */}
                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111112] p-4">
                  <div className="text-xs font-black text-zinc-400 uppercase tracking-widest">Dados da Ficha</div>
                  <input
                    placeholder="Letra do treino (A, B, C...)"
                    value={passoLetra}
                    onChange={e => setPassoLetra(e.target.value.slice(0, 3))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm uppercase outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20"
                  />
                  <input
                    placeholder="Nome (opcional)"
                    value={passoNome}
                    onChange={e => setPassoNome(e.target.value.slice(0, 80))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20"
                  />
                </div>

                <button
                  onClick={finishPasso}
                  disabled={createPasso.isPending || !passoLetra.trim() || selectedExercises.length === 0}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black px-5 py-3 font-bold text-sm hover:brightness-110 disabled:opacity-60 transition-all"
                >
                  {createPasso.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {createPasso.isPending ? "Criando..." : "Criar e Atribuir Treino"}
                </button>
              </div>
            </div>
          )}

          {/* Step: Completed */}
          {assignStep === "completed" && (
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-[var(--lime)]/20 animate-pulse" />
                <div
                  className="relative w-24 h-24 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--lime), #a8d400)",
                    boxShadow: "0 0 60px -10px rgba(204,255,0,0.5)",
                  }}
                >
                  <CheckCircle2 className="w-10 h-10 text-black" />
                </div>
              </div>
              <h1 className="text-3xl font-black text-white mb-2">Treino Atribuido!</h1>
              <p className="text-sm text-zinc-400 mb-8">O treino ja aparece para {studentName}</p>
              <button
                onClick={() => { setShowAssign(false); setAssignStep("choice"); }}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] text-black px-6 py-3 font-bold text-sm hover:brightness-110 transition-all"
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Workout List */}
      <div className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5">
          <div className="w-1 h-4 rounded-full bg-[var(--lime)]" />
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Fichas</h2>
        </div>
        {workouts.length === 0 ? (
          <div className="p-10 text-center">
            <BookOpen className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Nenhuma ficha ainda.</p>
            <p className="text-xs text-zinc-600 mt-1">Atribua um treino acima para comecar.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {workouts.map((w) => (
              <div key={w.id} className="flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-[var(--lime)] text-black font-black text-2xl flex items-center justify-center shrink-0">
                  {w.letra}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white">Treino {w.letra}</div>
                  {w.nome && <div className="text-xs text-zinc-500 truncate">{w.nome}</div>}
                  {w.data_inicio && (
                    <div className="text-[11px] text-zinc-600 mt-0.5">
                      Criado em {new Date(w.data_inicio).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to="/ficha/$id"
                    params={{ id: w.id }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-white px-3 py-2 text-xs font-bold hover:bg-white/10 hover:border-[var(--lime)]/40 transition-all"
                  >
                    <Pencil className="w-3 h-3" />
                    Editar
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir Treino ${w.letra}?`)) del.mutate({ data: { id: w.id } });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 text-xs font-bold hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Passo Configurator ─── */
function PassoConfigurator({
  exercise,
  exerciseIndex,
  onAdd,
  onSkip,
}: {
  exercise: Exercise;
  exerciseIndex: number;
  onAdd: (sets: number, reps: number) => void;
  onSkip: () => void;
}) {
  const isCardio = exercise.bodyPart === "cardio";
  const isLegs = exercise.bodyPart === "upper legs" || exercise.bodyPart === "lower legs";
  const defaultSets = isCardio ? 1 : isLegs ? 4 : 3;
  const defaultReps = isCardio ? 1 : isLegs ? 10 : 12;
  const [sets, setSets] = useState(defaultSets);
  const [reps, setReps] = useState(defaultReps);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-3 px-4 text-center">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Series x Repeticoes</div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSets(Math.max(1, sets - 1))}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
            >
              -
            </button>
            <div className="text-center min-w-[60px]">
              <span className="text-2xl font-black text-white">{sets}</span>
              <span className="text-xs text-zinc-400 ml-1">series</span>
            </div>
            <button
              onClick={() => setSets(Math.min(10, sets + 1))}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
            >
              +
            </button>
          </div>
          <span className="text-lg text-zinc-600 font-bold">de</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReps(Math.max(1, reps - 1))}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
            >
              -
            </button>
            <div className="text-center min-w-[60px]">
              <span className="text-2xl font-black text-[var(--lime)]">{reps}</span>
              <span className="text-xs text-zinc-400 ml-1">reps</span>
            </div>
            <button
              onClick={() => setReps(Math.min(50, reps + 1))}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 rounded-xl bg-white/5 border border-white/10 text-zinc-400 py-3 text-sm font-bold hover:bg-white/10 hover:text-white transition-all"
        >
          Pular
        </button>
        <button
          onClick={() => onAdd(sets, reps)}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black py-3 text-sm font-bold hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>
    </div>
  );
}
