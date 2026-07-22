import { createFileRoute } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import {
  searchExercises,
  getExerciseById,
  listBodyParts,
  listEquipments,
  BODYPART_PT,
  EQUIPMENT_PT,
  TARGET_PT,
  DIFFICULTY_PT,
  ptTerm,
  type Exercise,
} from "@/lib/exercisedb.functions";
import { Search, Loader2, X } from "lucide-react";
import { useState } from "react";

const BODY_PARTS_STATIC = [
  "chest",
  "back",
  "shoulders",
  "upper arms",
  "lower arms",
  "upper legs",
  "lower legs",
  "waist",
  "cardio",
  "neck",
] as const;

const BODY_PART_COVERS: Record<string, { img: string; color: string }> = {
  chest: {
    img: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80",
    color: "from-blue-600/80",
  },
  back: {
    img: "https://images.unsplash.com/photo-1603287681836-b1a4b448f3e0?w=600&q=80",
    color: "from-emerald-600/80",
  },
  shoulders: {
    img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80",
    color: "from-orange-600/80",
  },
  "upper arms": {
    img: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80",
    color: "from-purple-600/80",
  },
  "lower arms": {
    img: "https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=600&q=80",
    color: "from-pink-600/80",
  },
  "upper legs": {
    img: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=600&q=80",
    color: "from-red-600/80",
  },
  "lower legs": {
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80",
    color: "from-teal-600/80",
  },
  waist: {
    img: "https://images.unsplash.com/photo-1571019613576-2b22c76fd955?w=600&q=80",
    color: "from-amber-600/80",
  },
  cardio: {
    img: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=600&q=80",
    color: "from-rose-600/80",
  },
  neck: {
    img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80",
    color: "from-indigo-600/80",
  },
};

const BODY_PART_DESCRIPTIONS: Record<string, string> = {
  chest: "Supino, flexoes, crossover e mais",
  back: "Remada, puxada, dominada e mais",
  shoulders: "Desenvolvimento, elevacao lateral e mais",
  "upper arms": "Biceps, triceps e variacoes",
  "lower arms": "Antebraco e pegada",
  "upper legs": "Agachamento, leg press, afundado e mais",
  "lower legs": "Panturrilha em pe, sentado e mais",
  waist: "Abdominal, prancha, obliquos e mais",
  cardio: "Cardio e exercicios funcionais",
  neck: "Exercicios para pescoco",
};

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

  const activeBodyParts = bodyParts.data ?? [...BODY_PARTS_STATIC];
  const isSearching = !!(q || bodyPart || equipment);

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
    enabled: isSearching,
  });

  const detail = useQuery({
    queryKey: ["ex", "detail", selectedSummary?.id],
    queryFn: () => getExerciseById({ data: { id: selectedSummary!.id } }),
    enabled: !!selectedSummary,
    staleTime: 1000 * 60 * 60,
  });

  const selected = detail.data ?? selectedSummary;

  const clearFilters = () => {
    setQ("");
    setBodyPart("");
    setEquipment("");
  };

  const handleBodyPartClick = (bp: string) => {
    setBodyPart(bp);
    setQ("");
    setEquipment("");
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111112]">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/80 to-transparent" />
        <div className="relative p-6">
          <h1 className="text-2xl font-black text-white leading-tight">Biblioteca de Exercicios</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Explore por grupo muscular ou busque pelo nome. Toque para ver a animacao.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rounded-2xl border border-white/10 bg-[#111112] p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome (ex: supino, agachamento, rosca)"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--lime)]/60 capitalize"
          >
            <option value="">Todos os grupos</option>
            {activeBodyParts.map((b) => (
              <option key={b} value={b}>{BODYPART_PT[b] ?? b}</option>
            ))}
          </select>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[var(--lime)]/60 capitalize"
          >
            <option value="">Todos equipamentos</option>
            {(equipments.data ?? []).map((b) => (
              <option key={b} value={b}>{EQUIPMENT_PT[b] ?? b}</option>
            ))}
          </select>
          {isSearching && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Body Part Grid */}
      {!isSearching ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeBodyParts.map((bp) => (
            <BodyPartCard
              key={bp}
              bodyPart={bp}
              onClick={() => handleBodyPartClick(bp)}
            />
          ))}
        </div>
      ) : results.isLoading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : results.isError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Erro ao buscar exercicios.
        </div>
      ) : (results.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#111112] p-8 text-center text-sm text-zinc-500">
          Nada encontrado. Tente outros filtros.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {results.data!.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} onSelect={setSelectedSummary} />
          ))}
        </div>
      )}

      {selected && (
        <ExerciseDetail
          exercise={selected}
          isLoading={detail.isLoading}
          onClose={() => setSelectedSummary(null)}
        />
      )}
    </div>
  );
}

function BodyPartCard({ bodyPart, onClick }: { bodyPart: string; onClick: () => void }) {
  const ptName = BODYPART_PT[bodyPart] ?? bodyPart;
  const cover = BODY_PART_COVERS[bodyPart] ?? {
    img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80",
    color: "from-zinc-600/80",
  };
  const description = BODY_PART_DESCRIPTIONS[bodyPart] ?? "Exercicios para " + ptName;

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111112] group text-left h-40 sm:h-48"
    >
      <img
        src={cover.img}
        alt={ptName}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className={`absolute inset-0 bg-gradient-to-t ${cover.color} to-transparent`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="text-lg font-black text-white capitalize">{ptName}</div>
        <div className="text-xs text-white/70 mt-0.5">{description}</div>
      </div>
    </button>
  );
}

function ExerciseCard({
  exercise,
  onSelect,
}: {
  exercise: Exercise;
  onSelect: (e: Exercise) => void;
}) {
  return (
    <button
      onClick={() => onSelect(exercise)}
      className="text-left rounded-2xl border border-white/10 bg-[#111112] overflow-hidden hover:border-[var(--lime)]/40 transition-all group"
    >
      <div className="aspect-square bg-white overflow-hidden">
        <img
          src={exercise.gifUrl}
          alt={exercise.name}
          loading="lazy"
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3">
        <div className="text-xs font-bold text-white capitalize line-clamp-2 leading-tight">
          {exercise.name}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--lime)]/15 text-[var(--lime)]">
            {ptTerm(TARGET_PT, exercise.target) ?? exercise.target}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
            {ptTerm(EQUIPMENT_PT, exercise.equipment) ?? exercise.equipment}
          </span>
        </div>
      </div>
    </button>
  );
}

function ExerciseDetail({
  exercise,
  isLoading,
  onClose,
}: {
  exercise: Exercise;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-[#111112] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="relative bg-white">
          <img
            src={exercise.gifUrl}
            alt={exercise.name}
            className="w-full aspect-square object-contain"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <h2 className="text-lg font-black text-white capitalize">{exercise.name}</h2>
          <div className="flex flex-wrap gap-1.5">
            <Tag>{ptTerm(BODYPART_PT, exercise.bodyPart) ?? exercise.bodyPart}</Tag>
            <Tag primary>{ptTerm(TARGET_PT, exercise.target) ?? exercise.target}</Tag>
            <Tag>{ptTerm(EQUIPMENT_PT, exercise.equipment) ?? exercise.equipment}</Tag>
            {exercise.difficulty && <Tag>{ptTerm(DIFFICULTY_PT, exercise.difficulty) ?? exercise.difficulty}</Tag>}
          </div>
          {exercise.secondaryMuscles?.length ? (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Musculos secundarios
              </div>
              <div className="flex flex-wrap gap-1">
                {exercise.secondaryMuscles.map((m) => (
                  <Tag key={m}>{ptTerm(TARGET_PT, m) ?? ptTerm(BODYPART_PT, m) ?? m}</Tag>
                ))}
              </div>
            </div>
          ) : null}
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando instrucoes...
            </div>
          ) : exercise.instructions?.length ? (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Como executar
              </div>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-zinc-300">
                {exercise.instructions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Tag({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
        primary ? "bg-[var(--lime)] text-black" : "bg-white/5 text-zinc-400"
      }`}
    >
      {children}
    </span>
  );
}
