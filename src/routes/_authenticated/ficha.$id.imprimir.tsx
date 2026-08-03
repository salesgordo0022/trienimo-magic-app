import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getFicha, type GroupWithExercises, type ExerciseRow } from "@/lib/workouts.functions";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect } from "react";

const fichaQO = (id: string) =>
  queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/ficha/$id/imprimir")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(fichaQO(params.id)),
  component: ImprimirFicha,
});

function formatDate(d: string | null | undefined): string {
  if (!d) return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const date = new Date(d.includes("T") ? d : `${d}T00:00:00`);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ImprimirFicha() {
  const { id } = Route.useParams();
  const { data: ficha } = useSuspenseQuery(fichaQO(id));

  const w = ficha.workout;
  const conjugado = w.tipo === "conjugado" || w.conjugado === true;
  const voltas = w.voltas ?? 1;
  const groups = ficha.groups.filter((g) => g.exercises.length > 0);
  const allExercises = groups.flatMap((g) => g.exercises);
  const hasContent = allExercises.length > 0;

  useEffect(() => {
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#e7e7e7] text-black print:bg-white print:p-0">
      {/* Toolbar (hidden ao imprimir) */}
      <div className="print:hidden sticky top-0 z-40 bg-black text-white shadow">
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center gap-2">
          <Link to="/ficha/$id" params={{ id }} className="text-white p-1 hover:bg-white/10 rounded">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="font-display font-black uppercase text-sm">PDF — Treino {w.letra}</div>
          <div className="ml-auto">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-[var(--yellow)] text-black px-3 py-1.5 text-xs font-black uppercase rounded hover:brightness-110"
            >
              <Printer className="w-3 h-3" />
              Salvar / Imprimir PDF
            </button>
          </div>
        </div>
      </div>

      {/* Documento */}
      <div className="max-w-4xl mx-auto p-3 sm:p-6 print:p-0 print:m-0">
        <div className="bg-white border border-black/10 print:border-0 shadow-sm print:shadow-none">
          {/* Cabeçalho: logo + nome + letra */}
          <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b-2 border-black">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/imperial-fitness-logo.png"
                alt="Logo"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded object-cover border border-black/10 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-display font-black text-xl sm:text-2xl leading-tight truncate">
                  {ficha.profile.logo_texto || "SuaLogo"}
                </div>
                <div className="font-bold text-xs sm:text-sm truncate">
                  {ficha.profile.personal_nome ?? "SEU NOME - PERSONAL TRAINER"}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">Ficha de Treino</div>
              </div>
            </div>
            <div className="bg-black text-[var(--yellow)] px-4 sm:px-5 py-2 sm:py-3 text-center min-w-[80px] shrink-0">
              <div className="text-[9px] sm:text-[10px] font-bold text-white uppercase">Treino</div>
              <div className="font-display font-black text-4xl sm:text-5xl leading-none">{w.letra}</div>
              {conjugado && <div className="text-[8px] font-black text-yellow-300 uppercase tracking-widest mt-0.5">Conjugado</div>}
            </div>
          </div>

          {/* Informações: data, dias, observação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black/10 text-sm">
            <InfoField label="Data" value={formatDate(w.data_inicio)} />
            <InfoField label="Dias" value={ficha.profile.dias_semana ?? ""} />
            <InfoField label="Observação" value={w.observacao ?? ""} />
          </div>

          {/* Exercícios */}
          {!hasContent ? (
            <div className="p-10 text-center text-sm text-gray-500">Nenhum exercício cadastrado.</div>
          ) : conjugado ? (
            <div className="p-4 sm:p-5">
              <ConjugadoTable exercises={allExercises} voltas={voltas} />
            </div>
          ) : (
            <div className="p-4 sm:p-5 space-y-6">
              {groups.map((g) => (
                <GroupTable key={g.id} group={g} />
              ))}
            </div>
          )}
        </div>

        <div className="print:hidden mt-4 flex justify-center">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-black text-[var(--yellow)] px-6 py-3 text-sm font-black uppercase rounded hover:opacity-90"
          >
            <Printer className="w-4 h-4" />
            Salvar como PDF
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2.5">
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</div>
      <div className="font-bold text-sm truncate">{value || "—"}</div>
    </div>
  );
}

function GroupTable({ group }: { group: GroupWithExercises }) {
  if (group.exercises.length === 0) return null;
  return (
    <div>
      <div className="bg-black text-[var(--yellow)] px-3 py-1.5 font-display font-black uppercase text-sm mb-0 print:mb-1">
        {group.nome}
      </div>
      <table className="w-full border-collapse text-sm print:text-[11px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black/20 px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wider">Exercício</th>
            <th className="border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider w-16">Séries</th>
            <th className="border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider w-16">Reps</th>
            <th className="border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider w-24">Peso (kg)</th>
          </tr>
        </thead>
        <tbody>
          {group.exercises.map((ex, i) => (
            <tr key={ex.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="border border-black/20 px-2 py-1.5 font-bold capitalize">{ex.nome}</td>
              <td className="border border-black/20 px-2 py-1.5 text-center font-bold">{ex.series}</td>
              <td className="border border-black/20 px-2 py-1.5 text-center font-bold">{ex.sets_config?.[0]?.reps ?? "—"}</td>
              <td className="border border-black/20 px-2 py-1.5 text-center font-bold">{ex.sets_config?.[0]?.kg ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConjugadoTable({ exercises, voltas }: { exercises: ExerciseRow[]; voltas: number }) {
  return (
    <div>
      <div className="bg-black text-[var(--yellow)] px-3 py-1.5 font-display font-black uppercase text-sm mb-0 print:mb-1">
        Treino Conjugado
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm print:text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider w-14">
                {voltas}x
              </th>
              {exercises.map((ex, i) => (
                <th key={ex.id} className={`border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider min-w-[90px] ${i > 0 ? "" : ""}`}>
                  {ex.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: voltas }, (_, vi) => (
              <tr key={`r${vi}`} className={vi % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-black/20 px-2 py-1.5 text-center font-bold">{vi + 1}ª</td>
                {exercises.map((ex) => (
                  <td key={ex.id} className="border border-black/20 px-2 py-1.5 text-center font-bold">
                    {Math.round(ex.series / voltas)}x
                  </td>
                ))}
              </tr>
            ))}
            {[
              { label: "Peso (kg)", key: "kg" },
              { label: "Repetições", key: "reps" },
            ].map((row) => (
              <tr key={row.key} className={row.key === "kg" ? "bg-white" : "bg-gray-50"}>
                <td className="border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider">
                  {row.label}
                </td>
                {exercises.map((ex) => (
                  <td key={ex.id} className="border border-black/20 px-2 py-1.5 text-center font-bold">
                    {row.key === "kg" ? (ex.sets_config?.[0]?.kg ?? "—") : (ex.sets_config?.[0]?.reps ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
