import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  useQuery,
  queryOptions,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getFicha,
  updateWorkout,
  addGroup,
  deleteGroup,
  addExercise,
  updateExercise,
  deleteExercise,
  type ExerciseRow,
} from "@/lib/workouts.functions";
import { getMyRole, listMyStudents } from "@/lib/roles.functions";
import { searchExercises, getExerciseById, type Exercise } from "@/lib/exercisedb.functions";
import {
  Plus,
  Minus,
  Trash2,
  History,
  ArrowLeft,
  User,
  FileText,
  Check,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const fichaQO = (id: string) =>
  queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });
const studentsQO = () =>
  queryOptions({ queryKey: ["myStudents"], queryFn: () => listMyStudents() });

type FichaTab = "ficha" | "aluno";

export const Route = createFileRoute("/_authenticated/ficha/$id")({
  validateSearch: (search: Record<string, unknown>): { tab?: FichaTab } => ({
    tab:
      search.tab === "aluno" || search.tab === "ficha"
        ? (search.tab as FichaTab)
        : undefined,
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(fichaQO(params.id)),
  component: FichaEditor,
});

const pageBg =
  "radial-gradient(1200px 600px at 15% 10%, rgba(163,230,53,0.08), transparent 60%), radial-gradient(900px 500px at 90% 90%, rgba(163,230,53,0.05), transparent 60%), #0b0b0d";
const glassCard =
  "rounded-2xl border border-white/10 backdrop-blur-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]";
const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-zinc-600 focus:border-[var(--lime)]/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-[var(--lime)]/10";
const limeBtn =
  "inline-flex items-center justify-center gap-2 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60";
const limeBtnStyle = {
  background: "linear-gradient(135deg, #A3E635, #84CC16)",
  boxShadow: "0 10px 30px -12px rgba(163,230,53,0.55)",
} as const;
const chipBtn =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all";

function FichaEditor() {
  const { id } = Route.useParams();
  const { tab: initialTab } = Route.useSearch();
  const { data } = useSuspenseQuery(fichaQO(id));
  const { data: role } = useQuery(roleQO());
  const qc = useQueryClient();
  const isTeacher = role?.role === "admin" || role?.role === "professor";
  const [tab, setTab] = useState<FichaTab>(initialTab ?? "ficha");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ficha", id] });

  const updW = useMutation({ mutationFn: useServerFn(updateWorkout), onSuccess: invalidate });
  const addG = useMutation({ mutationFn: useServerFn(addGroup), onSuccess: invalidate });
  const delG = useMutation({ mutationFn: useServerFn(deleteGroup), onSuccess: invalidate });
  const addE = useMutation({ mutationFn: useServerFn(addExercise), onSuccess: invalidate });
  const delE = useMutation({ mutationFn: useServerFn(deleteExercise), onSuccess: invalidate });

  const [newGroupName, setNewGroupName] = useState("");

  return (
    <div
      className="min-h-screen text-white pb-24"
      style={{
        fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
        background: pageBg,
      }}
    >
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/50 border-b border-white/5 safe-top safe-x">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <Link
            to="/app"
            aria-label="Voltar"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src="/imperial-fitness-logo.png"
              alt="Logo"
              className="w-8 h-8 rounded-lg object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white tracking-tight truncate">
                Treino {data.workout.letra}
              </div>
              {data.profile.personal_nome && (
                <div className="text-[10px] text-zinc-500 truncate">
                  {data.profile.personal_nome}
                </div>
              )}
            </div>
          </div>
          <div className="ml-auto flex gap-1 shrink-0">
            <Link
              to="/ficha/$id/historico"
              params={{ id }}
              aria-label="Historico"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white"
            >
              <History className="w-3 h-3" />
              <span className="hidden sm:inline">Historico</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-3 sm:p-6 space-y-5 safe-x">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 w-full sm:w-fit overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTab("ficha")}
            className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${tab === "ficha" ? "text-black shadow" : "text-zinc-400 hover:text-white"}`}
            style={tab === "ficha" ? limeBtnStyle : undefined}
          >
            <FileText className="w-3.5 h-3.5" />
            Ficha
          </button>
          {isTeacher && (
            <button
              onClick={() => setTab("aluno")}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${tab === "aluno" ? "text-black shadow" : "text-zinc-400 hover:text-white"}`}
              style={tab === "aluno" ? limeBtnStyle : undefined}
            >
              <User className="w-3.5 h-3.5" />
              Aluno
            </button>
          )}
        </div>

        {tab === "aluno" && isTeacher && (
          <AlunoTab
            workoutId={id}
            currentAssigned={data.workout.assigned_to ?? null}
            onChanged={invalidate}
          />
        )}

        {tab === "ficha" && (
          <>
            {/* Cabeçalho estilo ficha */}
            <div className={`${glassCard} overflow-hidden`}>
              <div className="grid grid-cols-[1fr_auto] gap-3 p-5 items-stretch">
                <div className="flex items-center gap-4">
                  <img
                    src="/imperial-fitness-logo.png"
                    alt="Logo"
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                  <div className="hidden md:block border-l border-white/10 pl-4">
                    <div className="font-semibold text-sm text-white">
                      {data.profile.personal_nome ?? "SEU NOME - PERSONAL TRAINER"}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">FICHA DE TREINO</div>
                  </div>
                </div>
                <div
                  className="rounded-xl px-5 py-3 text-center min-w-[90px] text-black"
                  style={{ background: "linear-gradient(135deg, #A3E635, #84CC16)" }}
                >
                  <div className="text-[10px] font-bold uppercase opacity-70">Treino</div>
                  <div className="font-bold text-4xl leading-none">{data.workout.letra}</div>
                </div>
              </div>
              <div className="border-t border-white/5 divide-y divide-white/5 text-sm">
                <HeaderField
                  label="Data do Inicio"
                  value={data.workout.data_inicio ?? ""}
                  onSave={(v) => updW.mutate({ data: { id, data_inicio: v } })}
                  type="date"
                />
                <HeaderField
                  label="Observacao"
                  value={data.workout.observacao ?? ""}
                  onSave={(v) => updW.mutate({ data: { id, observacao: v } })}
                />
              </div>
            </div>

            {/* Grupos */}
            {data.groups.map((g) => (
              <GroupBlock
                key={g.id}
                group={g}
                onDelete={() => delG.mutate({ data: { id: g.id } })}
                onAddExercise={(nome, exercise_db_id) =>
                  addE.mutate({ data: { group_id: g.id, nome, exercise_db_id } })
                }
                onDeleteExercise={(eid) => delE.mutate({ data: { id: eid } })}
                onExerciseSaved={invalidate}
              />
            ))}

            <form
              className={`${glassCard} p-4 flex gap-2`}
              onSubmit={(e) => {
                e.preventDefault();
                if (!newGroupName) return;
                addG.mutate({ data: { workout_id: id, nome: newGroupName } });
                setNewGroupName("");
              }}
            >
              <input
                placeholder="Novo grupo (ex: COSTAS, PERNAS...)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className={inputCls}
              />
              <button type="submit" className={limeBtn} style={limeBtnStyle}>
                <Plus className="w-4 h-4" />
                Grupo
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function AlunoTab({
  workoutId,
  currentAssigned,
  onChanged,
}: {
  workoutId: string;
  currentAssigned: string | null;
  onChanged: () => void;
}) {
  const { data: students = [] } = useQuery(studentsQO());
  const [sel, setSel] = useState<string>(currentAssigned ?? "");
  useEffect(() => {
    setSel(currentAssigned ?? "");
  }, [currentAssigned]);
  const upd = useMutation({
    mutationFn: useServerFn(updateWorkout),
    onSuccess: () => {
      onChanged();
      toast.success("Aluno vinculado à ficha");
    },
    onError: (e) => toast.error(e.message),
  });
  const currentName = students.find((s) => s.id === currentAssigned)?.nome ?? null;
  return (
    <div className={`${glassCard} p-5 space-y-4`}>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-black"
          style={{ background: "linear-gradient(135deg, #A3E635, #84CC16)" }}
        >
          <User className="w-5 h-5" />
        </div>
        <div>
          <div className="text-white font-semibold text-sm">Vincular aluno a esta ficha</div>
          <div className="text-xs text-zinc-500">
            Atualmente:{" "}
            {currentAssigned ? (
              (currentName ?? "aluno selecionado")
            ) : (
              <span className="italic">nenhum (ficha pessoal)</span>
            )}
          </div>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
          Você ainda não tem alunos. Cadastre um na página{" "}
          <Link to="/professor" className="text-[var(--lime)] underline">
            Meus alunos
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => {
              setSel("");
              upd.mutate({ data: { id: workoutId, assigned_to: null } });
            }}
            className={`text-left rounded-xl p-3 border transition-all ${!sel ? "border-[var(--lime)]/60 bg-[var(--lime)]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
          >
            <div className="text-sm font-semibold text-white">Pessoal (sem aluno)</div>
            <div className="text-[11px] text-zinc-500">Ficha fica na sua conta</div>
          </button>
          {students.map((s) => {
            const active = sel === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSel(s.id);
                  upd.mutate({ data: { id: workoutId, assigned_to: s.id } });
                }}
                className={`text-left rounded-xl p-3 border transition-all flex items-center gap-3 ${active ? "border-[var(--lime)]/60 bg-[var(--lime)]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${active ? "bg-[var(--lime)] text-black" : "bg-white/10 text-white"}`}
                >
                  {(s.nome ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {s.nome ?? "(sem nome)"}
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate">{s.id.slice(0, 8)}</div>
                </div>
                {active && <Check className="w-4 h-4 text-[var(--lime)]" />}
              </button>
            );
          })}
        </div>
      )}
      {upd.isPending && (
        <div className="text-xs text-zinc-500 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
        </div>
      )}
    </div>
  );
}

function HeaderField({
  label,
  value,
  onSave,
  readOnly,
  type,
}: {
  label: string;
  value: string;
  onSave?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  const [v, setV] = useState(value);
  return (
    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr] items-center">
      <div className="px-3 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-zinc-400 bg-white/[0.02]">
        {label}
      </div>
      {readOnly ? (
        <div className="px-3 sm:px-4 py-2.5 text-sm text-white truncate">
          {value || <span className="text-zinc-600 text-xs">defina em Perfil</span>}
        </div>
      ) : (
        <input
          type={type ?? "text"}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== value && onSave?.(v)}
          className="px-3 sm:px-4 py-2.5 text-sm bg-transparent text-white outline-none focus:bg-[var(--lime)]/5 min-w-0"
        />
      )}
    </div>
  );
}

function GroupBlock({
  group,
  onDelete,
  onAddExercise,
  onDeleteExercise,
  onExerciseSaved,
}: {
  group: { id: string; nome: string; exercises: ExerciseRow[] };
  onDelete: () => void;
  onAddExercise: (nome: string, exercise_db_id?: string | null) => void;
  onDeleteExercise: (id: string) => void;
  onExerciseSaved: () => void;
}) {
  const [newEx, setNewEx] = useState("");
  return (
    <div className={`${glassCard} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 bg-black/30">
        <div
          className="w-1 h-5 rounded-full"
          style={{ background: "linear-gradient(180deg, #A3E635, #84CC16)" }}
        />
        <div className="font-semibold uppercase tracking-wide text-sm text-white flex-1">
          {group.nome}
        </div>
        <button
          onClick={() => {
            if (confirm("Excluir grupo e exercícios?")) onDelete();
          }}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-[10px] uppercase tracking-wider text-black"
              style={{ background: "linear-gradient(135deg, #A3E635, #84CC16)" }}
            >
              <th className="px-2 py-2 w-12 text-left font-bold">Nº</th>
              <th className="px-2 py-2 text-left font-bold">Exercício</th>
              {[0, 1, 2, 3].map((i) => (
                <>
                  <th key={"r" + i} className="px-2 py-2 w-16 text-left font-bold">
                    Repets
                  </th>
                  <th key={"k" + i} className="px-2 py-2 w-16 text-left font-bold">
                    Kg
                  </th>
                </>
              ))}
              <th className="px-2 py-2 w-16 text-left font-bold">Desc</th>
              <th className="px-2 py-2 w-24 text-left font-bold">Obs</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {group.exercises.map((ex, i) => (
              <ExerciseRowEditor
                key={ex.id}
                ex={ex}
                rowIndex={i}
                onSaved={onExerciseSaved}
                onDelete={() => onDeleteExercise(ex.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-white/5">
        {group.exercises.map((ex) => (
          <ExerciseCardMobile
            key={ex.id}
            ex={ex}
            onSaved={onExerciseSaved}
            onDelete={() => onDeleteExercise(ex.id)}
          />
        ))}
      </div>

      <form
        className="p-3 flex gap-2 border-t border-white/5 flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newEx) return;
          onAddExercise(newEx);
          setNewEx("");
        }}
      >
        <input
          placeholder="Novo exercício"
          value={newEx}
          onChange={(e) => setNewEx(e.target.value)}
          className={`${inputCls} py-2 flex-1 min-w-[150px]`}
        />
        <ExerciseLibraryButton onPick={(ex) => onAddExercise(ex.name, ex.id)} />
        <button type="submit" className={`${chipBtn} text-black`} style={limeBtnStyle}>
          <Plus className="w-3 h-3" />
          Add
        </button>
      </form>
    </div>
  );
}

function ExerciseLibraryButton({
  onPick,
  trigger,
}: {
  onPick: (ex: Exercise) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const results = useQuery({
    queryKey: ["ex", "quicksearch", q],
    queryFn: () => searchExercises({ data: { q: q || undefined, limit: 20 } }),
    enabled: open,
    staleTime: 1000 * 60 * 10,
  });
  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${chipBtn} bg-white/5 border border-white/10 text-white`}
        >
          <Search className="w-3 h-3" />
          Biblioteca
        </button>
      )}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-2xl bg-[#111112] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <Search className="w-4 h-4 text-zinc-500" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar exercício (ex: bench, curl, squat)"
                  className="flex-1 bg-transparent outline-none text-sm text-white"
                />
                <button onClick={() => setOpen(false)} className="text-zinc-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-3">
                {results.isLoading ? (
                  <div className="p-8 text-center text-sm text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Buscando...
                  </div>
                ) : (results.data?.length ?? 0) === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-500">Nada encontrado.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {results.data!.map((ex: Exercise) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => {
                          onPick(ex);
                          setOpen(false);
                        }}
                        className="text-left rounded-xl border border-white/10 bg-black/30 overflow-hidden hover:border-[var(--lime)]/50"
                      >
                        <img
                          src={ex.gifUrl}
                          alt={ex.name}
                          loading="lazy"
                          className="w-full aspect-square object-contain bg-white"
                        />
                        <div className="p-2">
                          <div className="text-[11px] font-bold text-white capitalize line-clamp-2 leading-tight">
                            {ex.name}
                          </div>
                          <div className="text-[9px] text-zinc-500 mt-0.5 capitalize">
                            {ex.target} · {ex.equipment}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function useExerciseState(ex: ExerciseRow) {
  const [series, setSeries] = useState(String(ex.series));
  const [desc, setDesc] = useState(String(ex.desc_segundos));
  const [obs, setObs] = useState(ex.obs ?? "");
  const [nome, setNome] = useState(ex.nome);
  const sc = ex.sets_config ?? [];
  const [sets, setSets] = useState<Array<{ reps: string; kg: string }>>(
    Array.from({ length: 4 }, (_, i) => ({ reps: sc[i]?.reps ?? "", kg: sc[i]?.kg ?? "" })),
  );
  return { series, setSeries, desc, setDesc, obs, setObs, nome, setNome, sets, setSets };
}

function useSaveStatus() {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 900);
    return () => clearTimeout(t);
  }, [status]);
  return [status, setStatus] as const;
}

function ExerciseRowEditor({
  ex,
  rowIndex,
  onSaved,
  onDelete,
}: {
  ex: ExerciseRow;
  rowIndex: number;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [status, setStatus] = useSaveStatus();
  const upd = useMutation({
    mutationFn: useServerFn(updateExercise),
    onMutate: () => setStatus("saving"),
    onSuccess: () => {
      onSaved();
      setStatus("saved");
    },
    onError: (e) => {
      setStatus("idle");
      toast.error(e.message);
    },
  });
  const s = useExerciseState(ex);
  const save = () =>
    upd.mutate({
      data: {
        id: ex.id,
        nome: s.nome,
        series: parseInt(s.series) || 1,
        desc_segundos: parseInt(s.desc) || 0,
        obs: s.obs || null,
        sets_config: s.sets,
      },
    });
  const stepSeries = (delta: number) => {
    const n = Math.max(1, Math.min(20, (parseInt(s.series) || 1) + delta));
    s.setSeries(String(n));
    setTimeout(save, 0);
  };
  const bg = rowIndex % 2 === 0 ? "bg-white/[0.015]" : "bg-white/[0.04]";
  const td = "px-2 py-2 border-b border-white/5 text-white";
  const inp = "bg-transparent outline-none focus:bg-[var(--lime)]/5 rounded px-1 py-0.5";
  return (
    <tr className={`${bg} transition-colors ${status === "saved" ? "bg-[var(--lime)]/10" : ""}`}>
      <td className={`${td} w-16`}>
        <div className="inline-flex items-center gap-0.5">
          <button
            onClick={() => stepSeries(-1)}
            className="text-zinc-500 hover:text-[var(--lime)] p-0.5"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            value={s.series}
            onChange={(e) => s.setSeries(e.target.value)}
            onBlur={save}
            className={`${inp} w-6 text-center`}
          />
          <button
            onClick={() => stepSeries(1)}
            className="text-zinc-500 hover:text-[var(--lime)] p-0.5"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </td>
      <td className={td}>
        <div className="flex items-center gap-1.5">
          <ExerciseLibraryButton
            onPick={(picked) => {
              s.setNome(picked.name);
              upd.mutate({ data: { id: ex.id, nome: picked.name, exercise_db_id: picked.id } });
            }}
            trigger={
              ex.exercise_db_id ? (
                <img
                  src={`/api/public/exercise-gif/${ex.exercise_db_id}`}
                  alt=""
                  className="w-7 h-7 rounded-md object-contain bg-white shrink-0 cursor-pointer border border-white/10"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-md bg-white/5 border border-white/10 text-zinc-500 flex items-center justify-center shrink-0 cursor-pointer hover:text-[var(--lime)]"
                  title="Vincular GIF da biblioteca"
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                </div>
              )
            }
          />
          <input
            value={s.nome}
            onChange={(e) => s.setNome(e.target.value)}
            onBlur={save}
            className={`${inp} w-full`}
          />
          {status === "saving" && (
            <Loader2 className="w-3 h-3 text-zinc-500 animate-spin shrink-0" />
          )}
          {status === "saved" && <Check className="w-3 h-3 text-[var(--lime)] shrink-0" />}
        </div>
      </td>
      {s.sets.map((set, i) => (
        <>
          <td key={"r" + i} className={td}>
            <input
              value={set.reps}
              onChange={(e) => {
                const c = [...s.sets];
                c[i] = { ...c[i], reps: e.target.value };
                s.setSets(c);
              }}
              onBlur={save}
              placeholder="10"
              className={`${inp} w-14 placeholder:text-zinc-700`}
            />
          </td>
          <td key={"k" + i} className={td}>
            <input
              value={set.kg}
              onChange={(e) => {
                const c = [...s.sets];
                c[i] = { ...c[i], kg: e.target.value };
                s.setSets(c);
              }}
              onBlur={save}
              placeholder="kg"
              className={`${inp} w-14 placeholder:text-zinc-700`}
            />
          </td>
        </>
      ))}
      <td className={td}>
        <input
          value={s.desc}
          onChange={(e) => s.setDesc(e.target.value)}
          onBlur={save}
          className={`${inp} w-12`}
        />
        <span className="text-zinc-500">s</span>
      </td>
      <td className={td}>
        <input
          value={s.obs}
          onChange={(e) => s.setObs(e.target.value)}
          onBlur={save}
          className={`${inp} w-full placeholder:text-zinc-700`}
          placeholder="—"
        />
      </td>
      <td className={td}>
        <button
          onClick={onDelete}
          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}

function ExerciseCardMobile({
  ex,
  onSaved,
  onDelete,
}: {
  ex: ExerciseRow;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [status, setStatus] = useSaveStatus();
  const upd = useMutation({
    mutationFn: useServerFn(updateExercise),
    onMutate: () => setStatus("saving"),
    onSuccess: () => {
      onSaved();
      setStatus("saved");
    },
    onError: () => setStatus("idle"),
  });
  const s = useExerciseState(ex);
  const save = () =>
    upd.mutate({
      data: {
        id: ex.id,
        nome: s.nome,
        series: parseInt(s.series) || 1,
        desc_segundos: parseInt(s.desc) || 0,
        obs: s.obs || null,
        sets_config: s.sets,
      },
    });
  const stepSeries = (delta: number) => {
    const n = Math.max(1, Math.min(20, (parseInt(s.series) || 1) + delta));
    s.setSeries(String(n));
    setTimeout(save, 0);
  };
  return (
    <div
      className={`p-3 space-y-2 transition-colors ${status === "saved" ? "bg-[var(--lime)]/10" : ""}`}
    >
      <div className="flex gap-2 items-center">
        <ExerciseLibraryButton
          onPick={(picked) => {
            s.setNome(picked.name);
            upd.mutate({ data: { id: ex.id, nome: picked.name, exercise_db_id: picked.id } });
          }}
          trigger={
            ex.exercise_db_id ? (
              <img
                src={`/api/public/exercise-gif/${ex.exercise_db_id}`}
                alt=""
                className="w-8 h-8 rounded-md object-contain bg-white shrink-0 cursor-pointer border border-white/10"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-md bg-white/5 border border-white/10 text-zinc-500 flex items-center justify-center shrink-0 cursor-pointer hover:text-[var(--lime)]"
                title="Vincular GIF da biblioteca"
              >
                <Dumbbell className="w-4 h-4" />
              </div>
            )
          }
        />
        <input
          value={s.nome}
          onChange={(e) => s.setNome(e.target.value)}
          onBlur={save}
          className="flex-1 font-semibold text-sm bg-transparent border-b border-white/10 focus:border-[var(--lime)]/60 outline-none text-white pb-1"
        />
        {status === "saving" && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
        {status === "saved" && <Check className="w-4 h-4 text-[var(--lime)]" />}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-3 text-xs text-zinc-400 items-center">
        <div className="flex items-center gap-1">
          <span>Séries</span>
          <button
            onClick={() => stepSeries(-1)}
            className="w-6 h-6 rounded-md border border-white/10 text-white hover:bg-white/10 flex items-center justify-center"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            value={s.series}
            onChange={(e) => s.setSeries(e.target.value)}
            onBlur={save}
            className="w-8 border-b border-white/10 bg-transparent text-white text-center outline-none focus:border-[var(--lime)]/60"
          />
          <button
            onClick={() => stepSeries(1)}
            className="w-6 h-6 rounded-md border border-white/10 text-white hover:bg-white/10 flex items-center justify-center"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <label className="flex items-center gap-1.5">
          Desc{" "}
          <input
            value={s.desc}
            onChange={(e) => s.setDesc(e.target.value)}
            onBlur={save}
            className="w-10 border-b border-white/10 bg-transparent text-white text-center outline-none focus:border-[var(--lime)]/60"
          />
          s
        </label>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {s.sets.map((set, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs">
            <div className="text-[10px] text-zinc-500 mb-1">Série {i + 1}</div>
            <input
              value={set.reps}
              onChange={(e) => {
                const c = [...s.sets];
                c[i] = { ...c[i], reps: e.target.value };
                s.setSets(c);
              }}
              onBlur={save}
              placeholder="reps"
              className="w-full bg-transparent text-white outline-none placeholder:text-zinc-700"
            />
            <input
              value={set.kg}
              onChange={(e) => {
                const c = [...s.sets];
                c[i] = { ...c[i], kg: e.target.value };
                s.setSets(c);
              }}
              onBlur={save}
              placeholder="kg"
              className="w-full bg-transparent text-white outline-none placeholder:text-zinc-700"
            />
          </div>
        ))}
      </div>
      <input
        value={s.obs}
        onChange={(e) => s.setObs(e.target.value)}
        onBlur={save}
        placeholder="Observação"
        className="w-full text-xs border-b border-white/10 bg-transparent text-white outline-none focus:border-[var(--lime)]/60 pb-1 placeholder:text-zinc-600"
      />
    </div>
  );
}

function ExTag({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded capitalize ${primary ? "bg-[var(--lime)] text-black" : "bg-white/5 text-zinc-400"}`}
    >
      {children}
    </span>
  );
}

