import { Fragment } from "react";
import { type FichaFull, type GroupWithExercises, type ExerciseRow } from "@/lib/workouts.functions";
import { formatDesc, PAIRS, splitByMuscle } from "@/lib/muscle-groups";

function formatDate(d: string | null | undefined): string {
  if (!d) return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const date = new Date(d.includes("T") ? d : `${d}T00:00:00`);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function FichaDocument({ data }: { data: FichaFull }) {
  const w = data.workout;
  const conjugado = w.tipo === "conjugado" || w.conjugado === true;
  const voltas = w.voltas ?? 1;
  const groups = data.groups.filter((g) => g.exercises.length > 0);
  const allExercises = groups.flatMap((g) => g.exercises);
  const hasContent = allExercises.length > 0;

  return (
    <div className="bg-white text-black p-3 sm:p-5 print:p-0 space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-stretch gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img
            src="/imperial-fitness-logo.png"
            alt="Logo"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded bg-black p-1.5 object-contain shrink-0"
          />
          <div className="font-display font-black text-2xl sm:text-3xl leading-none truncate">
            <span>{data.profile.logo_texto || "SuaLogo"}</span>
          </div>
        </div>
        <div className="flex-1 border-2 border-black">
          <div className="text-center font-black uppercase text-sm sm:text-base px-2 py-1.5 border-b border-black/20 truncate">
            {data.profile.personal_nome ?? "SEU NOME - PERSONAL TRAINER"}
          </div>
          <div className="text-center font-bold uppercase text-[11px] sm:text-xs px-2 py-1 tracking-wide">
            Ficha de Treino
          </div>
        </div>
      </div>

      {/* Info + letra do treino */}
      <div className="flex items-start gap-3">
        <div className="flex-1 border border-black/30">
          <InfoRow label="Aluno" value={w.assigned_nome || data.profile.nome || "—"} />
          <InfoRow label="Data do Início" value={formatDate(w.data_inicio)} />
          <InfoRow label="Objetivo" value={w.objetivo ?? data.profile.objetivo ?? "—"} />
          <InfoRow label="Dias da Semana" value={w.dias_semana ?? data.profile.dias_semana ?? "—"} />
          <InfoRow label="Observação" value={w.observacao ?? data.profile.observacao ?? "—"} last />
        </div>
        <div className="w-32 sm:w-40 border-2 border-black bg-black text-center shrink-0">
          <div className="bg-black text-white font-black uppercase text-xs py-1.5 tracking-widest">Treino:</div>
          <div className="bg-black font-display font-black text-5xl sm:text-6xl leading-none py-2 text-[var(--yellow)]">
            {w.letra}
          </div>
          {conjugado && (
            <div className="bg-[var(--yellow)] text-black text-[9px] font-black uppercase tracking-widest py-0.5">
              Conjugado
            </div>
          )}
        </div>
      </div>

      {/* Exercícios */}
      {conjugado && hasContent ? (
        <ConjugadoTable exercises={allExercises} voltas={voltas} />
      ) : (
        <div className="space-y-3">
          {splitByMuscle(groups).map((g) => (
            <GroupTable key={g.id} group={g} />
          ))}
        </div>
      )}

      {/* Regeneração */}
      <SectionBox title="Regeneração:" lines={3} />

      {/* Observações */}
      <div>
        <div className="bg-black text-[var(--yellow)] text-center font-black uppercase text-xs py-1">
          Observações
        </div>
        <div className="border border-black/30 border-t-0 p-3 text-center text-[11px] font-bold text-[#c0392b] leading-snug">
          Ajuste cargas e repetições conforme sua evolução. Em caso de dor ou desconforto, interrompa o exercício e
          fale com seu personal trainer.
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex text-[11px] sm:text-xs ${last ? "" : "border-b border-black/20"}`}>
      <div className="w-32 sm:w-40 shrink-0 bg-gray-200 px-2 py-1 text-right font-black uppercase tracking-wide">
        {label}:
      </div>
      <div className="flex-1 px-2 py-1 font-bold truncate">{value || "—"}</div>
    </div>
  );
}

function SectionBox({ title, lines }: { title: string; lines: number }) {
  return (
    <div>
      <div className="bg-gray-300 text-black text-center font-black uppercase text-xs py-1 border border-black/30">
        {title}
      </div>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-5 border border-t-0 border-black/30" />
      ))}
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`border border-black/40 px-1.5 py-1 text-[10px] font-black uppercase tracking-wide bg-gray-200 ${className}`}
    >
      {children}
    </th>
  );
}

function GroupTable({ group }: { group: GroupWithExercises }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px] print:text-[10px] min-w-[640px] print:min-w-0">
        <thead>
          <tr>
            <Th className="w-10 bg-black text-[var(--yellow)]">Nº</Th>
            <Th className="min-w-[150px] text-left bg-[var(--yellow)] text-black">{group.nome}</Th>
            {Array.from({ length: PAIRS }, (_, i) => [
              <Th key={`r${i}`} className="w-12">Repets</Th>,
              <Th key={`k${i}`} className="w-12">Kg</Th>,
            ])}
            <Th className="w-14">Desc</Th>
            <Th className="w-20">Obs</Th>
          </tr>
        </thead>
        <tbody>
          {group.exercises.map((ex, i) => (
            <tr key={ex.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="border border-black/40 px-1.5 py-1 text-center font-black">{ex.series}x</td>
              <td className="border border-black/40 px-1.5 py-1 font-bold capitalize break-words">{ex.nome}</td>
              {Array.from({ length: PAIRS }, (_, s) => {
                const set = ex.sets_config?.[s];
                return [
                  <td key={`r${s}`} className="border border-black/40 px-1 py-1 text-center">
                    {set?.reps ?? ""}
                  </td>,
                  <td key={`k${s}`} className="border border-black/40 px-1 py-1 text-center">
                    {set?.kg ?? ""}
                  </td>,
                ];
              })}
              <td className="border border-black/40 px-1 py-1 text-center font-bold">{formatDesc(ex.desc_segundos)}</td>
              <td className="border border-black/40 px-1 py-1 text-center">{ex.obs ?? ""}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(1, 2 - group.exercises.length) }, (_, i) => (
            <tr key={`empty${i}`}>
              <td className="border border-black/40 h-5" colSpan={3 + PAIRS * 2 + 1} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConjugadoTable({ exercises, voltas }: { exercises: ExerciseRow[]; voltas: number }) {
  const cols = 1 + exercises.length * 2 - 1;
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-[11px] print:text-[10px]"
        style={{ minWidth: Math.max(360, 60 + exercises.length * 120) }}
      >
        <thead>
          <tr>
            <Th className="w-14 bg-black text-[var(--yellow)]">{voltas}x</Th>
            {exercises.map((ex, i) => (
              <Fragment key={ex.id}>
                {i > 0 && (
                  <Th className="w-8 px-0 text-[var(--yellow)]">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/10 text-sm font-black text-black/60">+</span>
                  </Th>
                )}
                <Th className="min-w-[110px] bg-[var(--yellow)] text-black">{ex.nome}</Th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: voltas }, (_, vi) => (
            <tr key={`r${vi}`} className={vi % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="border border-black/40 px-1.5 py-1 text-center font-black">{vi + 1}ª</td>
              {exercises.map((ex, i) => (
                <Fragment key={ex.id}>
                  {i > 0 && <td className="w-8 px-0 border border-black/40" />}
                  <td className="border border-black/40 px-1.5 py-1 text-center font-bold">
                    {Math.round(ex.series / voltas)}x
                  </td>
                </Fragment>
              ))}
            </tr>
          ))}
          {[
            { label: "Peso (kg)", key: "kg" as const },
            { label: "Repetições", key: "reps" as const },
          ].map((row) => (
            <tr key={row.key} className="bg-gray-50">
              <td className="border border-black/40 px-1 py-1 text-center text-[10px] font-black uppercase">
                {row.label}
              </td>
              {exercises.map((ex, i) => (
                <Fragment key={ex.id}>
                  {i > 0 && <td className="w-8 px-0 border border-black/40" />}
                  <td className="border border-black/40 px-1.5 py-1 text-center font-bold">
                    {ex.sets_config?.[0]?.[row.key] ?? "—"}
                  </td>
                </Fragment>
              ))}
            </tr>
          ))}
          <tr>
            <td className="border border-black/40 h-5" colSpan={cols} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
