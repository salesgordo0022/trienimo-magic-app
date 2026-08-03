import type { GroupWithExercises, ExerciseRow } from "@/lib/workouts.functions";

export function formatDesc(s: number | null | undefined): string {
  if (!s) return "";
  if (s >= 60 && s % 60 === 0) return `${s / 60}min`;
  return `${s}s`;
}

export const PAIRS = 4;

/** Descobre o grupo muscular pelo nome do exercício (igual ao padrão da ficha impressa). */
export const MUSCLE_RULES: Array<[string, RegExp]> = [
  ["PEITO", /supino|crucifixo|peck|cross ?over|crossover|paralelas|peitoral|flex[aã]o de bra[çc]o/i],
  ["COSTAS", /puxada|remada|pulldown|barra fixa|pullover|serrote|dorsal|costas/i],
  ["OMBROS", /desenvolvimento|eleva[çc][ãa]o lateral|eleva[çc][ãa]o frontal|encolhimento|crucifixo inverso|ombro|deltoid/i],
  ["BÍCEPS", /rosca|b[íi]ceps/i],
  ["TRÍCEPS", /tr[íi]ceps|testa|franc[êe]s|corda|mergulho|coice/i],
  ["ANTEBRAÇO", /antebra[çc]o|punho/i],
  ["PERNAS", /agachamento|leg press|extensora|afundo|passada|avan[çc]o|hack|b[úu]lgaro|quadr[íi]ceps|ades?utora|adutora|abdutora/i],
  ["POSTERIOR", /flexora|stiff|levantamento terra|terra|posterior|glute ham/i],
  ["GLÚTEOS", /gl[úu]teo|eleva[çc][ãa]o p[ée]lvica|coice de gl[úu]teo/i],
  ["PANTURRILHA", /panturrilha|gêmeos|g[êe]meos|s[óo]leo/i],
  ["ABDÔMEN", /abdominal|abdomen|abd[ôo]men|prancha|obl[íi]quo|core/i],
  ["CARDIO", /esteira|bicicleta|el[íi]ptico|corrida|remo erg|cardio|pular corda/i],
];

export function muscleOf(nome: string, fallback: string): string {
  for (const [label, re] of MUSCLE_RULES) if (re.test(nome)) return label;
  return fallback;
}

/** Uma tabela por grupo muscular — todos aparecem, mesmo sem exercícios. */
export function splitByMuscle(groups: GroupWithExercises[]): GroupWithExercises[] {
  const buckets = new Map<string, ExerciseRow[]>();
  for (const [label] of MUSCLE_RULES) buckets.set(label, []);
  for (const g of groups) {
    for (const ex of g.exercises) {
      const label = muscleOf(ex.nome, g.nome);
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label)!.push(ex);
    }
  }
  return Array.from(buckets.entries()).map(([nome, exercises], i) => ({
    id: `grp-${nome}`,
    nome,
    ordem: i,
    exercises,
  }));
}
