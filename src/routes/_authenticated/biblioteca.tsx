import { createFileRoute } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import {
  searchExercises,
  getExerciseById,
  listBodyParts,
  listEquipments,
  BODYPART_PT,
  EQUIPMENT_PT,
  type Exercise,
} from "@/lib/exercisedb.functions";
import { Search, Loader2, Dumbbell, X } from "lucide-react";
import { useState } from "react";

const bodyPartsQO = () =>
  queryOptions({
    queryKey: ["ex", "bodyParts"],
    queryFn: () => listBodyParts(),
    staleTime: 1000 * 60 * 60,
  });
const equipmentsQO = () =>
  queryOptions({
    queryKey: ["ex", "equipments"],
    queryFn: () => listEquipments(),
    staleTime: 1000 * 60 * 60,
  });

export const Route = createFileRoute("/_authenticated/biblioteca")({
  component: Biblioteca,
});

function Biblioteca() {
  const [q, setQ] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<Exercise | null>(null);

  const bodyParts = useQuery(bodyPartsQO());
  const equipments = useQuery(equipmentsQO());

  const results = useQuery({
    queryKey: ["ex", "search", { q, bodyPart, equipment }],
    queryFn: () =>
      searchExercises({
        data: {
          q: q || undefined,
          bodyPart: bodyPart || undefined,
          equipment: equipment || undefined,
          limit: 30,
        },
      }),
    staleTime: 1000 * 60 * 10,
  });

  const detail = useQuery({
    queryKey: ["ex", "detail", selectedSummary?.id],
    queryFn: () => getExerciseById({ data: { id: selectedSummary!.id } }),
    enabled: !!selectedSummary,
    staleTime: 1000 * 60 * 60,
  });

  const selected = detail.data ?? selectedSummary;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      <header className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center">
          <Dumbbell className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black leading-tight">Biblioteca de Exercícios</h1>
          <p className="text-xs text-zinc-500">
            Mais de 1.300 exercícios com animação, músculo-alvo e equipamento.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-white/10 bg-[#111112] p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome (ex: bench, squat, curl)"
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[var(--lime)]/60"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--lime)]/60 capitalize"
          >
            <option value="">Todos os grupos</option>
            {(bodyParts.data ?? []).map((b) => (
              <option key={b} value={b}>
                {BODYPART_PT[b] ?? b}
              </option>
            ))}
          </select>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--lime)]/60 capitalize"
          >
            <option value="">Todos equipamentos</option>
            {(equipments.data ?? []).map((b) => (
              <option key={b} value={b}>
                {EQUIPMENT_PT[b] ?? b}
              </option>
            ))}
          </select>
          {(q || bodyPart || equipment) && (
            <button
              onClick={() => {
                setQ("");
                setBodyPart("");
                setEquipment("");
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs"
            >
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
      </div>

      {results.isLoading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : results.isError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Erro ao buscar exercícios.
        </div>
      ) : (results.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#111112] p-8 text-center text-sm text-zinc-500">
          Nada encontrado. Tente outros filtros.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {results.data!.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelectedSummary(ex)}
              className="text-left rounded-2xl border border-white/10 bg-[#111112] overflow-hidden hover:border-[var(--lime)]/40 transition-all"
            >
              <div className="aspect-square bg-white">
                <img
                  src={ex.gifUrl}
                  alt={ex.name}
                  loading="lazy"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-2.5">
                <div className="text-xs font-bold text-white capitalize line-clamp-2 leading-tight">
                  {ex.name}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--lime)]/15 text-[var(--lime)]">
                    {ex.target}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                    {ex.equipment}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedSummary(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-[#111112] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="relative bg-white">
              <img
                src={selected.gifUrl}
                alt={selected.name}
                className="w-full aspect-square object-contain"
              />
              <button
                onClick={() => setSelectedSummary(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <h2 className="text-lg font-black text-white capitalize">{selected.name}</h2>
              <div className="flex flex-wrap gap-1.5">
                <Tag>{selected.bodyPart}</Tag>
                <Tag primary>{selected.target}</Tag>
                <Tag>{selected.equipment}</Tag>
                {selected.difficulty && <Tag>{selected.difficulty}</Tag>}
              </div>
              {selected.secondaryMuscles?.length ? (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    Músculos secundários
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selected.secondaryMuscles.map((m) => (
                      <Tag key={m}>{m}</Tag>
                    ))}
                  </div>
                </div>
              ) : null}
              {detail.isLoading ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Traduzindo instruções...
                </div>
              ) : detail.data?.instructions?.length ? (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    Como executar
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-sm text-zinc-300">
                    {detail.data.instructions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${primary ? "bg-[var(--lime)] text-black" : "bg-white/5 text-zinc-400"}`}
    >
      {children}
    </span>
  );
}
