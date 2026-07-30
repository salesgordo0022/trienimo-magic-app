// Tradutor determinístico (sem chamadas externas) de nomes de exercícios EN -> PT-BR.
// Estratégia composicional: movimento base + modificadores + equipamento.

type Rule = { en: string; pt: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Movimentos base (a frase mais longa vence)
const BASE: Rule[] = [
  { en: "bench press", pt: "supino" },
  { en: "chest press", pt: "supino máquina" },
  { en: "chest fly", pt: "crucifixo" },
  { en: "pec deck", pt: "peck deck" },
  { en: "cable crossover", pt: "crossover na polia" },
  { en: "crossover", pt: "crossover" },
  { en: "push up", pt: "flexão de braço" },
  { en: "pushup", pt: "flexão de braço" },
  { en: "push ups", pt: "flexões de braço" },
  { en: "overhead press", pt: "desenvolvimento" },
  { en: "shoulder press", pt: "desenvolvimento" },
  { en: "military press", pt: "desenvolvimento militar" },
  { en: "arnold press", pt: "desenvolvimento arnold" },
  { en: "lateral raise", pt: "elevação lateral" },
  { en: "front raise", pt: "elevação frontal" },
  { en: "rear delt fly", pt: "crucifixo invertido" },
  { en: "reverse fly", pt: "crucifixo invertido" },
  { en: "reverse flye", pt: "crucifixo invertido" },
  { en: "fly", pt: "crucifixo" },
  { en: "flye", pt: "crucifixo" },
  { en: "upright row", pt: "remada alta" },
  { en: "shrug", pt: "encolhimento de ombros" },
  { en: "face pull", pt: "face pull" },
  { en: "lat pulldown", pt: "puxada dorsal" },
  { en: "pulldown", pt: "puxada" },
  { en: "pull down", pt: "puxada" },
  { en: "pullover", pt: "pullover" },
  { en: "pull over", pt: "pullover" },
  { en: "pull up", pt: "barra fixa" },
  { en: "pullup", pt: "barra fixa" },
  { en: "chin up", pt: "barra fixa pegada supinada" },
  { en: "chinup", pt: "barra fixa pegada supinada" },
  { en: "row", pt: "remada" },
  { en: "deadlift", pt: "levantamento terra" },
  { en: "good morning", pt: "bom dia (good morning)" },
  { en: "hyperextension", pt: "extensão lombar" },
  { en: "back extension", pt: "extensão lombar" },
  { en: "preacher curl", pt: "rosca scott" },
  { en: "hammer curl", pt: "rosca martelo" },
  { en: "concentration curl", pt: "rosca concentrada" },
  { en: "wrist curl", pt: "rosca de punho" },
  { en: "bicep curl", pt: "rosca bíceps" },
  { en: "biceps curl", pt: "rosca bíceps" },
  { en: "leg curl", pt: "mesa flexora" },
  { en: "curl", pt: "rosca" },
  { en: "triceps extension", pt: "extensão de tríceps" },
  { en: "tricep extension", pt: "extensão de tríceps" },
  { en: "triceps pushdown", pt: "tríceps na polia" },
  { en: "pushdown", pt: "tríceps na polia" },
  { en: "kickback", pt: "tríceps coice" },
  { en: "skull crusher", pt: "tríceps testa" },
  { en: "dip", pt: "mergulho (paralelas)" },
  { en: "dips", pt: "mergulho (paralelas)" },
  { en: "leg press", pt: "leg press" },
  { en: "leg extension", pt: "cadeira extensora" },
  { en: "hack squat", pt: "agachamento hack" },
  { en: "split squat", pt: "agachamento búlgaro" },
  { en: "squat", pt: "agachamento" },
  { en: "lunge", pt: "afundo" },
  { en: "step up", pt: "subida no banco" },
  { en: "hip thrust", pt: "elevação pélvica" },
  { en: "glute bridge", pt: "ponte de glúteo" },
  { en: "hip abduction", pt: "abdução de quadril" },
  { en: "hip adduction", pt: "adução de quadril" },
  { en: "calf raise", pt: "elevação de panturrilha" },
  { en: "calf press", pt: "panturrilha no leg press" },
  { en: "crunch", pt: "abdominal" },
  { en: "sit up", pt: "abdominal completo" },
  { en: "situp", pt: "abdominal completo" },
  { en: "leg raise", pt: "elevação de pernas" },
  { en: "knee raise", pt: "elevação de joelhos" },
  { en: "russian twist", pt: "torção russa" },
  { en: "mountain climber", pt: "escalador" },
  { en: "plank", pt: "prancha" },
  { en: "jumping jack", pt: "polichinelo" },
  { en: "burpee", pt: "burpee" },
  { en: "jump rope", pt: "pular corda" },
  { en: "run", pt: "corrida" },
  { en: "running", pt: "corrida" },
  { en: "walk", pt: "caminhada" },
  { en: "walking", pt: "caminhada" },
  { en: "stretch", pt: "alongamento" },
  { en: "swing", pt: "swing" },
  { en: "clean and jerk", pt: "arremesso (clean and jerk)" },
  { en: "clean", pt: "clean" },
  { en: "snatch", pt: "arranco" },
  { en: "thruster", pt: "thruster" },
  { en: "raise", pt: "elevação" },
  { en: "extension", pt: "extensão" },
  { en: "press", pt: "press" },
  { en: "twist", pt: "rotação de tronco" },
  { en: "rotation", pt: "rotação" },
  { en: "hold", pt: "isometria" },
  { en: "carry", pt: "caminhada com carga" },
];

// Modificadores (posição, pegada, execução)
const MODIFIERS: Rule[] = [
  { en: "incline", pt: "inclinado" },
  { en: "decline", pt: "declinado" },
  { en: "flat", pt: "reto" },
  { en: "seated", pt: "sentado" },
  { en: "standing", pt: "em pé" },
  { en: "lying", pt: "deitado" },
  { en: "prone", pt: "de bruços" },
  { en: "supine", pt: "deitado de costas" },
  { en: "kneeling", pt: "ajoelhado" },
  { en: "bent over", pt: "curvado" },
  { en: "bent knee", pt: "com joelhos flexionados" },
  { en: "straight arm", pt: "com braços estendidos" },
  { en: "straight leg", pt: "com pernas estendidas" },
  { en: "wide grip", pt: "pegada aberta" },
  { en: "close grip", pt: "pegada fechada" },
  { en: "narrow grip", pt: "pegada fechada" },
  { en: "neutral grip", pt: "pegada neutra" },
  { en: "reverse grip", pt: "pegada invertida" },
  { en: "underhand", pt: "pegada supinada" },
  { en: "overhand", pt: "pegada pronada" },
  { en: "wide", pt: "aberto" },
  { en: "close", pt: "fechado" },
  { en: "reverse", pt: "invertido" },
  { en: "alternate", pt: "alternado" },
  { en: "alternating", pt: "alternado" },
  { en: "single arm", pt: "unilateral" },
  { en: "one arm", pt: "unilateral" },
  { en: "single leg", pt: "unilateral" },
  { en: "one leg", pt: "unilateral" },
  { en: "two arm", pt: "bilateral" },
  { en: "overhead", pt: "acima da cabeça" },
  { en: "behind neck", pt: "atrás da nuca" },
  { en: "behind the neck", pt: "atrás da nuca" },
  { en: "front", pt: "frontal" },
  { en: "side", pt: "lateral" },
  { en: "rear", pt: "posterior" },
  { en: "high", pt: "alto" },
  { en: "low", pt: "baixo" },
  { en: "wall", pt: "na parede" },
  { en: "floor", pt: "no solo" },
  { en: "bench", pt: "no banco" },
  { en: "bulgarian", pt: "búlgaro" },
  { en: "romanian", pt: "romeno" },
  { en: "sumo", pt: "sumô" },
  { en: "stiff leg", pt: "stiff" },
  { en: "walking", pt: "caminhando" },
  { en: "jump", pt: "com salto" },
  { en: "twisting", pt: "com rotação" },
  { en: "isometric", pt: "isométrico" },
  { en: "explosive", pt: "explosivo" },
  { en: "slow", pt: "lento" },
  { en: "static", pt: "estático" },
  { en: "dynamic", pt: "dinâmico" },
  { en: "partial", pt: "parcial" },
  { en: "full", pt: "completo" },
  { en: "cross body", pt: "cruzado" },
  { en: "hanging", pt: "na barra fixa" },
  { en: "decline bench", pt: "no banco declinado" },
];

// Equipamentos (vão para o final: "com barra", "na polia"...)
const EQUIPMENT: Rule[] = [
  { en: "ez barbell", pt: "com barra W" },
  { en: "ez bar", pt: "com barra W" },
  { en: "olympic barbell", pt: "com barra olímpica" },
  { en: "trap bar", pt: "com barra hexagonal" },
  { en: "barbell", pt: "com barra" },
  { en: "dumbbell", pt: "com halteres" },
  { en: "dumbbells", pt: "com halteres" },
  { en: "kettlebell", pt: "com kettlebell" },
  { en: "cable", pt: "na polia" },
  { en: "smith machine", pt: "no smith" },
  { en: "smith", pt: "no smith" },
  { en: "leverage machine", pt: "na máquina" },
  { en: "lever", pt: "na máquina" },
  { en: "machine", pt: "na máquina" },
  { en: "sled", pt: "no sled" },
  { en: "resistance band", pt: "com elástico" },
  { en: "band", pt: "com elástico" },
  { en: "medicine ball", pt: "com bola medicinal" },
  { en: "stability ball", pt: "com bola suíça" },
  { en: "exercise ball", pt: "com bola suíça" },
  { en: "bosu ball", pt: "no bosu" },
  { en: "wheel roller", pt: "com roda abdominal" },
  { en: "roller", pt: "com rolo" },
  { en: "rope", pt: "com corda" },
  { en: "suspension", pt: "na fita de suspensão" },
  { en: "body weight", pt: "peso do corpo" },
  { en: "bodyweight", pt: "peso do corpo" },
  { en: "weighted", pt: "com peso" },
  { en: "assisted", pt: "assistido" },
  { en: "stationary bike", pt: "na bicicleta ergométrica" },
  { en: "elliptical machine", pt: "no elíptico" },
  { en: "treadmill", pt: "na esteira" },
  { en: "stepmill machine", pt: "na escada ergométrica" },
  { en: "skierg machine", pt: "no skierg" },
  { en: "upper body ergometer", pt: "no ergômetro de braços" },
  { en: "tire", pt: "com pneu" },
  { en: "hammer", pt: "com martelo" },
];

// Grupos musculares que podem aparecer no nome
const MUSCLES: Rule[] = [
  { en: "chest", pt: "peito" },
  { en: "back", pt: "costas" },
  { en: "shoulder", pt: "ombro" },
  { en: "shoulders", pt: "ombros" },
  { en: "biceps", pt: "bíceps" },
  { en: "bicep", pt: "bíceps" },
  { en: "triceps", pt: "tríceps" },
  { en: "tricep", pt: "tríceps" },
  { en: "forearm", pt: "antebraço" },
  { en: "forearms", pt: "antebraços" },
  { en: "abs", pt: "abdômen" },
  { en: "abdominal", pt: "abdominal" },
  { en: "oblique", pt: "oblíquo" },
  { en: "obliques", pt: "oblíquos" },
  { en: "glute", pt: "glúteo" },
  { en: "glutes", pt: "glúteos" },
  { en: "hamstring", pt: "posterior de coxa" },
  { en: "hamstrings", pt: "posteriores de coxa" },
  { en: "quad", pt: "quadríceps" },
  { en: "quads", pt: "quadríceps" },
  { en: "calf", pt: "panturrilha" },
  { en: "calves", pt: "panturrilhas" },
  { en: "hip", pt: "quadril" },
  { en: "hips", pt: "quadril" },
  { en: "neck", pt: "pescoço" },
  { en: "lat", pt: "dorsal" },
  { en: "lats", pt: "dorsais" },
  { en: "trap", pt: "trapézio" },
  { en: "traps", pt: "trapézio" },
  { en: "leg", pt: "perna" },
  { en: "legs", pt: "pernas" },
  { en: "arm", pt: "braço" },
  { en: "arms", pt: "braços" },
  { en: "core", pt: "core" },
  { en: "lower back", pt: "lombar" },
  { en: "upper back", pt: "costas superiores" },
];

const NOISE = new Set(["the", "a", "an", "with", "and", "on", "in", "to", "of", "for", "version", "v", "up", "down"]);

function takePhrases(text: string, rules: Rule[]): { rest: string; found: string[] } {
  let rest = ` ${text} `;
  const found: string[] = [];
  const sorted = [...rules].sort((a, b) => b.en.length - a.en.length);
  for (const r of sorted) {
    const needle = ` ${r.en} `;
    if (rest.includes(needle)) {
      rest = rest.replace(needle, " ");
      if (!found.includes(r.pt)) found.push(r.pt);
    }
  }
  return { rest: rest.replace(/\s+/g, " ").trim(), found };
}

/**
 * Traduz um nome de exercício em inglês para PT-BR de forma composicional.
 * Retorna null quando não reconhece nenhum movimento base (para o chamador
 * decidir por outro fallback).
 */
export function composeExerciseName(nameEn: string): string | null {
  const text = norm(nameEn);
  if (!text) return null;

  // 1) movimento base (frase mais longa primeiro)
  const bases = [...BASE].sort((a, b) => b.en.length - a.en.length);
  const base = bases.find((b) => ` ${text} `.includes(` ${b.en} `));
  if (!base) return null;

  let rest = ` ${text} `.replace(` ${base.en} `, " ").replace(/\s+/g, " ").trim();

  const eq = takePhrases(rest, EQUIPMENT);
  rest = eq.rest;
  const mod = takePhrases(rest, MODIFIERS);
  rest = mod.rest;
  const mus = takePhrases(rest, MUSCLES);
  rest = mus.rest;

  const leftovers = rest
    .split(" ")
    .filter((w) => w && !NOISE.has(w));

  // Se sobrou palavra desconhecida em inglês, não arrisca: sinaliza falha
  if (leftovers.length > 0) return null;

  const parts = [base.pt, ...mus.found, ...mod.found, ...eq.found].filter(Boolean);
  const out = parts.join(" ").replace(/\s+/g, " ").trim();
  return out ? out.charAt(0).toUpperCase() + out.slice(1) : null;
}

const PT_HINT =
  /(ção|ções|ão|com |na |no |de |da |do |halteres|barra|polia|máquina|supino|agachamento|rosca|remada|puxada|elevação|abdominal|prancha|afundo|crucifixo|panturrilha|tríceps|bíceps|glúteo|coxa)/i;

export function looksPortuguese(text: string): boolean {
  return PT_HINT.test(text);
}
