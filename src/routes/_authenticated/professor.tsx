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
import { listWorkoutsForStudent, createWorkout, deleteWorkout, updateWorkout } from "@/lib/workouts.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Play, Users, Dumbbell, Search,
  UserPlus, ChevronRight, Pencil, BookOpen, CheckCircle2, X
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
            Dashboard
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

/* ─── Student Panel ─── */
function StudentPanel({ studentId, studentName }: { studentId: string; studentName: string }) {
  const qc = useQueryClient();
  const { data: workouts = [] } = useQuery({
    queryKey: ["studentWorkouts", studentId],
    queryFn: () => listWorkoutsForStudent({ data: { student_id: studentId } }),
  });
  const [letra, setLetra] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const create = useMutation({
    mutationFn: useServerFn(createWorkout),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["studentWorkouts", studentId] });
      qc.invalidateQueries({ queryKey: ["workouts"] });
      setLetra("");
      setShowCreate(false);
      toast.success(`Ficha ${(data as { letra: string }).letra} criada para ${studentName}!`);
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: useServerFn(deleteWorkout),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studentWorkouts", studentId] });
      qc.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Ficha excluida");
    },
  });

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

      {/* Create Workout */}
      <div className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
        <button
          onClick={() => setShowCreate((o) => !o)}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--lime)] flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4 text-black" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-bold text-white">Criar Ficha</div>
            <div className="text-[11px] text-zinc-500">Adicione uma nova ficha de treino</div>
          </div>
          <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${showCreate ? "rotate-90" : ""}`} />
        </button>

        {showCreate && (
          <div className="px-4 pb-4 border-t border-white/5 pt-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!letra.trim()) return;
                create.mutate({ data: { letra: letra.trim().toUpperCase(), assigned_to: studentId } });
              }}
              className="flex gap-2"
            >
              <div className="relative">
                <input
                  placeholder="A"
                  value={letra}
                  onChange={(e) => setLetra(e.target.value.slice(0, 3))}
                  className="w-20 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center text-2xl font-black text-[var(--lime)] uppercase outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-700 placeholder:text-base"
                />
              </div>
              <button
                type="submit"
                disabled={create.isPending || !letra.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black px-4 py-2.5 font-bold text-sm hover:brightness-110 disabled:opacity-60 transition-all"
              >
                {create.isPending ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Ficha
              </button>
            </form>
          </div>
        )}
      </div>

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
            <p className="text-xs text-zinc-600 mt-1">Crie uma ficha acima para comecar.</p>
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
