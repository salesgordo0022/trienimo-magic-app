import { type FichaFull, type GroupWithExercises, type ExerciseRow } from "@/lib/workouts.functions";

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
    <div className="bg-white text-black">
      {/* Cabeçalho: logo + nome + letra */}
      <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b-2 border-black">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/imperial-fitness-logo.png"
            alt="Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-black p-1.5 object-contain shrink-0"
          />
          <div className="min-w-0">
            <div className="font-display font-black text-xl sm:text-2xl leading-tight truncate">
              {data.profile.logo_texto || "SuaLogo"}
            </div>
            <div className="font-bold text-xs sm:text-sm truncate">
              {data.profile.personal_nome ?? "SEU NOME - PERSONAL TRAINER"}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">
              Ficha de Treino
            </div>
          </div>
        </div>
        <div className="bg-black text-[var(--yellow)] px-4 sm:px-5 py-2 sm:py-3 text-center min-w-[80px] shrink-0">
          <div className="text-[9px] sm:text-[10px] font-bold text-white uppercase">Treino</div>
          <div className="font-display font-black text-4xl sm:text-5xl leading-none">{w.letra}</div>
          {conjugado && (
            <div className="text-[8px] font-black text-yellow-300 uppercase tracking-widest mt-0.5">Conjugado</div>
          )}
        </div>
      </div>

      {/* Informações: data, dias, observação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black/10 text-sm">
        <InfoField label="Data" value={formatDate(w.data_inicio)} />
        <InfoField label="Dias" value={data.profile.dias_semana ?? ""} />
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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm print:text-[11px] min-w-[440px] print:min-w-0">
          <thead>
            <tr className="bg-gray-100">
              <th className="sticky left-0 z-10 bg-gray-100 border border-black/20 px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wider min-w-[150px]">
                Exercício
              </th>
              <th className="border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider w-16">
                Séries
              </th>
              <th className="border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider w-16">
                Reps
              </th>
              <th className="border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider w-24">
                Peso (kg)
              </th>
            </tr>
          </thead>
          <tbody>
            {group.exercises.map((ex, i) => (
              <tr key={ex.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td
                  className={`sticky left-0 z-10 border border-black/20 px-2 py-1.5 font-bold capitalize break-words ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  {ex.nome}
                </td>
                <td className="border border-black/20 px-2 py-1.5 text-center font-bold">{ex.series}</td>
                <td className="border border-black/20 px-2 py-1.5 text-center font-bold">
                  {ex.sets_config?.[0]?.reps ?? "—"}
                </td>
                <td className="border border-black/20 px-2 py-1.5 text-center font-bold">
                  {ex.sets_config?.[0]?.kg ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <table className="w-full border-collapse text-sm print:text-[11px]" style={{ minWidth: Math.max(320, 56 + exercises.length * 110) }}>
          <thead>
            <tr className="bg-gray-100">
              <th className="sticky left-0 z-10 bg-gray-100 border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider w-14 min-w-14">
                {voltas}x
              </th>
              {exercises.map((ex) => (
                <th
                  key={ex.id}
                  className="border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider min-w-[110px]"
                >
                  {ex.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: voltas }, (_, vi) => (
              <tr key={`r${vi}`} className={vi % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className={`sticky left-0 z-10 border border-black/20 px-2 py-1.5 text-center font-bold ${vi % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  {vi + 1}ª
                </td>
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
                <td className={`sticky left-0 z-10 border border-black/20 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider ${row.key === "kg" ? "bg-white" : "bg-gray-50"}`}>
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
