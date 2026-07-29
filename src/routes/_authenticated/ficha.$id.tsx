import { onGifError } from "@/lib/exercise-gif-fallback";
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
  updateExercise,
  type ExerciseRow,
} from "@/lib/workouts.functions";
import { getMyRole, listMyStudents } from "@/lib/roles.functions";
import { exerciseGifUrl } from "@/lib/exercisedb.functions";
import {
  History,
  ArrowLeft,
  User,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
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
const limeBtnStyle = {
  background: "linear-gradient(135deg, #A3E635, #84CC16)",
  boxShadow: "0 10px 30px -12px rgba(163,230,53,0.55)",
} as const;

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
                      {data.profile.personal_nome ?? "SEU NOME - TREINADOR PESSOAL"}
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
                  readOnly={!isTeacher}
                />
                <HeaderField
                  label="Observacao"
                  value={data.workout.observacao ?? ""}
                  onSave={(v) => updW.mutate({ data: { id, observacao: v } })}
                  readOnly={!isTeacher}
                />
              </div>
            </div>

            {/* Tabela de exercicios (sem grupos) */}
            <FichaTabela
              allExercises={data.groups.flatMap((g) => g.exercises)}
              isTeacher={isTeacher}
              onSaved={invalidate}
            />
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

function useSaveStatus() {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 900);
    return () => clearTimeout(t);
  }, [status]);
  return [status, setStatus] as const;
}

function FichaTabela({
  allExercises,
  isTeacher,
  onSaved,
}: {
  allExercises: ExerciseRow[];
  isTeacher: boolean;
  onSaved: () => void;
}) {
  if (allExercises.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111112] p-10 text-center text-sm text-zinc-500">
        Nenhum exercicio cadastrado.
      </div>
    );
  }
  return (
    <div className={`${glassCard} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: allExercises.length * 140 }}>
          <thead>
            <tr>
              <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider font-bold text-zinc-500 w-[70px]"></th>
              {allExercises.map((ex) => (
                <FichaTh
                  key={ex.id}
                  ex={ex}
                  isTeacher={isTeacher}
                  onSaved={onSaved}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { key: "peso", label: "Peso (kg)" },
              { key: "reps", label: "Repetições" },
              { key: "series", label: "Séries" },
            ].map((row) => (
              <tr key={row.key}>
                <td className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400 border-b border-white/5 align-middle">{row.label}</td>
                {allExercises.map((ex) => (
                  <FichaTd
                    key={ex.id}
                    ex={ex}
                    field={row.key}
                    isTeacher={isTeacher}
                    onSaved={onSaved}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FichaTh({
  ex,
  isTeacher,
  onSaved,
}: {
  ex: ExerciseRow;
  isTeacher: boolean;
  onSaved: () => void;
}) {
  const [status, setStatus] = useSaveStatus();
  const upd = useMutation({
    mutationFn: useServerFn(updateExercise),
    onMutate: () => setStatus("saving"),
    onSuccess: () => { onSaved(); setStatus("saved"); },
    onError: (e) => { setStatus("idle"); toast.error(e.message); },
  });
  const [nome, setNome] = useState(ex.nome);
  const saveNome = (v: string) => {
    setNome(v);
    upd.mutate({ data: { id: ex.id, nome: v } });
  };
  return (
    <th className="px-2 py-2.5 text-center border-b border-white/5 min-w-[130px]">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {ex.exercise_db_id && (
          <img
            src={exerciseGifUrl(ex.exercise_db_id)}
            alt=""
            className="w-7 h-7 rounded-md object-contain bg-white shrink-0 border border-white/10"
            onError={onGifError}
          />
        )}
      </div>
      {isTeacher ? (
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => nome !== ex.nome && saveNome(nome)}
          className="w-full bg-transparent text-center text-sm font-bold text-white outline-none focus:bg-[var(--lime)]/10 rounded px-1 py-0.5"
        />
      ) : (
        <span className="text-sm font-bold text-white">{nome}</span>
      )}
      {status === "saving" && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin inline ml-1" />}
      {status === "saved" && <Check className="w-3 h-3 text-[var(--lime)] inline ml-1" />}
    </th>
  );
}

function FichaTd({
  ex,
  field,
  isTeacher,
  onSaved,
}: {
  ex: ExerciseRow;
  field: string;
  isTeacher: boolean;
  onSaved: () => void;
}) {
  const [status, setStatus] = useSaveStatus();
  const upd = useMutation({
    mutationFn: useServerFn(updateExercise),
    onMutate: () => setStatus("saving"),
    onSuccess: () => { onSaved(); setStatus("saved"); },
    onError: (e) => { setStatus("idle"); toast.error(e.message); },
  });
  const [peso, setPeso] = useState(ex.sets_config?.[0]?.kg ?? "");
  const [reps, setReps] = useState(ex.sets_config?.[0]?.reps ?? "");
  const [series, setSeries] = useState(String(ex.series));
  const ro = !isTeacher;
  const value = field === "peso" ? peso : field === "reps" ? reps : series;
  const setter = field === "peso" ? setPeso : field === "reps" ? setReps : setSeries;
  const save = () =>
    upd.mutate({
      data: {
        id: ex.id,
        sets_config: [{ kg: peso, reps }],
        series: parseInt(series) || ex.series,
      },
    });
  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm font-semibold text-white text-center outline-none focus:border-[var(--lime)]/60 focus:bg-[var(--lime)]/10 transition-colors";
  return (
    <td className={`px-2 py-2 text-center border-b border-white/5 align-middle transition-colors ${status === "saved" ? "bg-[var(--lime)]/10" : status === "saving" ? "bg-white/[0.02]" : ""}`}>
      {ro ? (
        <span className="text-sm font-semibold text-white">{value || "—"}</span>
      ) : (
        <input
          value={value}
          onChange={(e) => setter(e.target.value)}
          onBlur={save}
          placeholder="0"
          type="number"
          min="0"
          step={field === "peso" ? "0.5" : "1"}
          className={inp}
        />
      )}
    </td>
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

