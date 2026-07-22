import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Exercise = {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  description?: string;
  difficulty?: string;
  category?: string;
};

const HOST = "exercisedb.p.rapidapi.com";
const BASE = `https://${HOST}`;

function headers() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY não configurada");
  return { "x-rapidapi-host": HOST, "x-rapidapi-key": key } as Record<string, string>;
}

// simple in-memory cache (per worker instance)
const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 1000 * 60 * 60 * 6; // 6h

async function cachedJson<T>(url: string): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error(`ExerciseDB ${r.status}`);
  const data = (await r.json()) as T;
  cache.set(url, { at: Date.now(), data });
  return data;
}

// PT -> EN body part mapping (usado para buscar por termo em português)
const PT_BODYPART: Record<string, string> = {
  peito: "chest",
  chest: "chest",
  costas: "back",
  back: "back",
  ombro: "shoulders",
  ombros: "shoulders",
  shoulders: "shoulders",
  biceps: "upper arms",
  bíceps: "upper arms",
  triceps: "upper arms",
  tríceps: "upper arms",
  braco: "upper arms",
  braço: "upper arms",
  bracos: "upper arms",
  antebraco: "lower arms",
  antebraço: "lower arms",
  perna: "upper legs",
  pernas: "upper legs",
  quadriceps: "upper legs",
  quadríceps: "upper legs",
  posterior: "upper legs",
  gluteo: "upper legs",
  glúteo: "upper legs",
  panturrilha: "lower legs",
  abdomen: "waist",
  abdômen: "waist",
  abs: "waist",
  core: "waist",
  cardio: "cardio",
  pescoco: "neck",
  pescoço: "neck",
};

// EN -> PT-BR dicionários (listas fechadas retornadas pela ExerciseDB)
export const BODYPART_PT: Record<string, string> = {
  back: "costas",
  cardio: "cardio",
  chest: "peito",
  "lower arms": "antebraços",
  "lower legs": "panturrilhas",
  neck: "pescoço",
  shoulders: "ombros",
  "upper arms": "braços",
  "upper legs": "pernas",
  waist: "abdômen",
};

export const TARGET_PT: Record<string, string> = {
  abductors: "abdutores",
  abs: "abdômen",
  adductors: "adutores",
  biceps: "bíceps",
  calves: "panturrilhas",
  "cardiovascular system": "sistema cardiovascular",
  delts: "deltoides",
  forearms: "antebraços",
  glutes: "glúteos",
  hamstrings: "posteriores de coxa",
  lats: "dorsais",
  "levator scapulae": "levantador da escápula",
  pectorals: "peitorais",
  quads: "quadríceps",
  "serratus anterior": "serrátil anterior",
  spine: "coluna",
  traps: "trapézio",
  triceps: "tríceps",
  "upper back": "costas superiores",
};

export const EQUIPMENT_PT: Record<string, string> = {
  assisted: "assistido",
  band: "faixa elástica",
  barbell: "barra reta",
  "body weight": "peso do corpo",
  "bosu ball": "bosu",
  cable: "cabo (polia)",
  dumbbell: "halteres",
  "elliptical machine": "elíptico",
  "ez barbell": "barra W",
  hammer: "martelo",
  kettlebell: "kettlebell",
  "leverage machine": "máquina articulada",
  "medicine ball": "bola medicinal",
  "olympic barbell": "barra olímpica",
  "resistance band": "faixa de resistência",
  roller: "rolo",
  rope: "corda",
  "skierg machine": "skierg",
  "sled machine": "sled",
  "smith machine": "smith",
  "stability ball": "bola de estabilidade",
  "stationary bike": "bicicleta ergométrica",
  "stepmill machine": "escada ergométrica",
  tire: "pneu",
  "trap bar": "barra hexagonal",
  "upper body ergometer": "ergômetro de membros superiores",
  weighted: "com peso",
  "wheel roller": "roda abdominal",
};

const MUSCLE_PT: Record<string, string> = { ...BODYPART_PT, ...TARGET_PT };

export const DIFFICULTY_PT: Record<string, string> = {
  beginner: "iniciante",
  intermediate: "intermediário",
  expert: "avançado",
};

export function ptTerm(map: Record<string, string>, term?: string): string | undefined {
  if (!term) return term;
  return map[term.toLowerCase().trim()] ?? term;
}

// Dicionário estático EN->PT dos exercícios mais comuns (resolve sem chamada externa)
const EXERCISE_NAME_PT: Record<string, string> = {
  "barbell bench press": "supino reto com barra",
  "dumbbell bench press": "supino reto com halteres",
  "incline barbell bench press": "supino inclinado com barra",
  "incline dumbbell bench press": "supino inclinado com halteres",
  "decline barbell bench press": "supino declinado com barra",
  "decline dumbbell bench press": "supino declinado com halteres",
  "close grip barbell bench press": "supino fechado com barra",
  "close grip bench press": "supino fechado",
  "barbell squat": "agachamento com barra",
  "goblet squat": "agachamento copa",
  "front squat": "agachamento frontal",
  "barbell deadlift": "levantamento terra",
  "romanian deadlift": "levantamento terra romeno",
  "sumo deadlift": "levantamento terra sumô",
  "trap bar deadlift": "levantamento terra barra hexagonal",
  "barbell row": "remada curvada com barra",
  "dumbbell row": "remada unilateral com halteres",
  "pull up": "barra fixa",
  "pull ups": "barra fixa",
  "chin up": "barra fixa pegada supinada",
  "chin ups": "barra fixa pegada supinada",
  "lat pulldown": "puxada dorsal",
  "wide grip lat pulldown": "puxada dorsal aberta",
  "close grip lat pulldown": "puxada dorsal fechada",
  "seated cable row": "remada baixa na polia",
  "face pull": "face pull na polia",
  "barbell shoulder press": "desenvolvimento com barra",
  "dumbbell shoulder press": "desenvolvimento com halteres",
  "arnold press": "arnold press",
  "lateral raise": "elevação lateral",
  "dumbbell lateral raise": "elevação lateral com halteres",
  "cable lateral raise": "elevação lateral na polia",
  "front raise": "elevação frontal",
  "dumbbell front raise": "elevação frontal com halteres",
  "bent over lateral raise": "elevação lateral curvada",
  "reverse fly": "crucifixo invertido",
  "upright row": "remada alta",
  "barbell bicep curl": "rosca bíceps com barra",
  "dumbbell bicep curl": "rosca bíceps com halteres",
  "hammer curl": "rosca martelo",
  "concentration curl": "rosca concentrada",
  "preacher curl": "rosca scott",
  "cable bicep curl": "rosca bíceps na polia",
  "tricep pushdown": "tríceps na polia",
  "cable tricep pushdown": "tríceps na polia",
  "overhead tricep extension": "tríceps testa",
  "skull crusher": "tríceps testa",
  "lying tricep extension": "tríceps testa deitado",
  "tricep dip": "mergulho tríceps",
  "dips": "mergulho",
  "leg press": "leg press",
  "leg extension": "cadeira extensora",
  "leg curl": "cadeira flexora",
  "lying leg curl": "flexora deitado",
  "standing leg curl": "flexora em pé",
  "standing calf raise": "elevação de panturrilha em pé",
  "seated calf raise": "elevação de panturrilha sentado",
  "hip thrust": "elevação pélvica",
  "barbell hip thrust": "elevação pélvica com barra",
  "glute bridge": "ponte",
  "lunge": "avanço",
  "walking lunge": "avanço caminhando",
  "dumbbell lunge": "avanço com halteres",
  "reverse lunge": "avanço reverso",
  "bulgarian split squat": "agachamento búlgaro",
  "step up": "step up",
  "good morning": "good morning",
  "hyperextension": "hiperextensão",
  "back extension": "extensão de costas",
  "crunch": "abdominal crunch",
  "sit up": "abdominal remador",
  "leg raise": "elevação de pernas",
  "hanging leg raise": "elevação de pernas na barra",
  "plank": "prancha",
  "side plank": "prancha lateral",
  "russian twist": "torção russa",
  "bicycle crunch": "abdominal bicicleta",
  "cable crunch": "abdominal na polia",
  "dumbbell side bend": "flexão lateral com halteres",
  "dumbbell shrug": "encolhimento com halteres",
  "barbell shrug": "encolhimento com barra",
  "farmer walk": "caminhada do fazendeiro",
  "dead bug": "dead bug",
  "bird dog": "bird dog",
  "push up": "flexão de braços",
  "push ups": "flexão de braços",
  "wide push up": "flexão aberta",
  "diamond push up": "flexão diamante",
  "incline push up": "flexão inclinada",
  "decline push up": "flexão declinada",
  "handstand push up": "flexão parada de mãos",
  "box jump": "salto na caixa",
  "jump squat": "agachamento com salto",
  "burpee": "burpee",
  "mountain climber": "escalador",
  "kettlebell swing": "swing com kettlebell",
  "kettlebell goblet squat": "agachamento copa com kettlebell",
  "kettlebell clean": "clean com kettlebell",
  "kettlebell snatch": "arranco com kettlebell",
  "medicine ball slam": "jogada de bola medicinal",
  "cable fly": "crucifixo na polia",
  "dumbbell fly": "crucifixo com halteres",
  "pec deck fly": "crucifixo máquina",
  "cable crossover": "crossover na polia",
  "incline dumbbell fly": "crucifixo inclinado com halteres",
  "dumbbell pullover": "pullover com halteres",
  "t bar row": "remada T",
  "smith machine squat": "agachamento no smith",
  "hack squat": "agachamento hack",
  "pistol squat": "agachamento pistola",
  "wall sit": "cadeira na parede",
  "box squat": "agachamento no banco",
  "split squat": "agachamento dividido",
  "calf press": "panturrilha no leg press",
  "reverse crunch": "abdominal reverso",
  "toe touch": "toque no pé",
  "v up": "abdominal v-up",
  "jackknife": "canivete",
  "ab roll out": "roda abdominal",
  "cable woodchop": "corte de lenha na polia",
  "glute kickback": "extensão de quadril na polia",
  "donkey kick": "chute burrinho",
  "fire hydrant": "hidrante",
  "clamshell": "conchinha",
  "hip abduction": "abdução de quadril",
  "hip adduction": "adução de quadril",
  "cable hip adduction": "adução na polia",
  "cable hip abduction": "abdução na polia",
  "monster walk": "caminhada do monstro",
  "bench press": "supino",
  "squat": "agachamento",
  "deadlift": "levantamento terra",
  "pullover": "pullover",
  "shoulder press": "desenvolvimento",
  "overhead press": "desenvolvimento",
  "skull crushers": "tríceps testa",
  "hip abductor": "abdutor de quadril",
  "hip adductor": "adutor de quadril",
  "abductor machine": "cadeira abdutora",
  "adductor machine": "cadeira adutora",
  "chest press machine": "supino máquina",
  "shoulder press machine": "desenvolvimento máquina",
  "chest dip": "mergulho no peito",
  "assisted pull up": "barra fixa assistida",
  "assisted chin up": "barra fixa assistida supinada",
  "smith machine bench press": "supino no smith",
  "smith machine shoulder press": "desenvolvimento no smith",
  "smith machine deadlift": "levantamento terra no smith",
  "bent over row": "remada curvada",
  "pendlay row": "remada pendlay",
  "dumbbell deadlift": "levantamento terra com halteres",
  "single leg deadlift": "levantamento terra unilateral",
  "dumbbell squat": "agachamento com halteres",
  "goblet squat kettlebell": "agachamento copa com kettlebell",
  "cable pull through": "puxada na polia",
  "band hip thrust": "elevação pélvica com elástico",
  "band hip abduction": "abdução com elástico",
  "band hip adduction": "adução com elástico",
  "band glute bridge": "ponte com elástico",
  "floor press": "supino no chão",
  "dumbbell floor press": "supino no chão com halteres",
  "landmine press": "desenvolvimento no landmine",
  "landmine row": "remada no landmine",
  "reverse grip bench press": "supino pegada invertida",
  "wide grip bench press": "supino aberto",
  "wide grip barbell bench press": "supino aberto com barra",
  "incline bench press": "supino inclinado",
  "decline bench press": "supino declinado",
  "one arm dumbbell bench press": "supino unilateral com halteres",
  "one arm dumbbell row": "remada unilateral com halteres",
  "dumbbell hammer curl": "rosca martelo com halteres",
  "cable hammer curl": "rosca martelo na polia",
  "reverse barbell curl": "rosca inversa com barra",
  "reverse dumbbell curl": "rosca inversa com halteres",
  "wrist curl": "flexão de punho",
  "reverse wrist curl": "extensão de punho",
  "treadmill": "esteira",
  "running treadmill": "corrida na esteira",
  "walking treadmill": "caminhada na esteira",
  "stationary bike": "bicicleta ergométrica",
  "rowing machine": "remada ergométrica",
  "elliptical machine": "elíptico",
  "stairmaster": "escada ergométrica",
  "stepmill": "escada ergométrica",
  "jumping jack": "polichinelo",
  "high knees": "elevação de joelhos",
  "butt kicks": "chute no glúteo",
  "bear crawl": "caminhada do urso",
  "crab walk": "caminhada do caranguejo",
  "inchworm": "lagartinha",
};

// Dicionário estático EN->PT para instruções comuns (usado como fallback rápido)
const EXERCISE_INSTRUCTION_PT: Record<string, string> = {
  "lie flat on a bench": "deite-se em um banco",
  "grip the bar": "segure a barra",
  "keep your back straight": "mantenha as costas retas",
  "breathe out": "expire",
  "breathe in": "inspire",
  "lower the bar": "abaixe a barra",
  "push the bar up": "empurre a barra para cima",
  "extend your arms": "estenda os braços",
  "bend your knees": "dobre os joelhos",
  "keep your core tight": "mantenha o abdômen contraído",
  "repeat for reps": "repita o movimento",
  "slow and controlled": "de forma lenta e controlada",
  "hold for a second": "segure por um segundo",
  "return to starting position": "volte à posição inicial",
  "keep your elbows close": "mantenha os cotovelos próximos",
  "keep your elbows slightly bent": "mantenha os cotovelos levemente flexionados",
  "don't lock your elbows": "não trave os cotovelos",
  "keep your chest up": "mantenha o peito para cima",
  "look forward": "olhe para frente",
  "engage your glutes": "contraia os glúteos",
  "engage your core": "contraia o abdômen",
  "drive through your heels": "empurre pelos calcanhares",
  "keep your shoulders back": "mantenha os ombros para trás",
  "keep your head neutral": "mantenha a cabeça neutra",
  "don't arch your back": "não arqueie as costas",
  "press the weight overhead": "empurre o peso acima da cabeça",
  "lower the weight slowly": "abaixe o peso lentamente",
  "full range of motion": "amplitude completa de movimento",
  "squeeze at the top": "contraia no topo do movimento",
  "control the descent": "controle a descida",
  "keep your feet flat": "mantenha os pés firmes no chão",
  "keep your feet shoulder width apart": "mantenha os pés na largura dos ombros",
  "keep your hips stable": "mantenha o quadril estável",
  "drive your knees out": "empurre os joelhos para fora",
  "sit back": "sente-se para trás",
  "push your hips forward": "empurre o quadril para frente",
  "pull the bar toward you": "puxe a barra em sua direção",
  "pull the bar to your chest": "puxe a barra até o peito",
  "pull your shoulders down": "puxe os ombros para baixo",
  "rotate your palms forward": "gire as palmas para frente",
  "rotate your palms backward": "gire as palmas para trás",
  "keep your wrists straight": "mantenha os punhos retos",
  "flex your feet": "flexione os pés",
  "point your toes": "aponte os dedos dos pés",
  "raise your hips": "eleve o quadril",
  "lower your hips": "abaixe o quadril",
  "step forward": "dê um passo à frente",
  "step backward": "dê um passo para trás",
  "step to the side": "dê um passo para o lado",
  "jump up": "salte para cima",
  "land softly": "aterrisse suavemente",
  "swing the kettlebell": "balance o kettlebell",
  "clean the kettlebell": "puxe o kettlebell",
  "snatch the kettlebell": "arranque o kettlebell",
  "roll out": "role para frente",
  "roll back": "role para trás",
  "twist your torso": "gire o tronco",
  "alternate sides": "alterne os lados",
  "keep your body in a straight line": "mantenha o corpo em linha reta",
  "don't let your hips sag": "não deixe o quadril cair",
};

// Tradução de texto livre (nome, instruções, descrição):
// 1º verifica dicionário estático, 2º MyMemory API com cache
export async function translateEN(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const lower = trimmed.toLowerCase();
  const dict = EXERCISE_NAME_PT[lower] ?? EXERCISE_INSTRUCTION_PT[lower];
  if (dict) return dict;
  const key = `tr:${trimmed}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data as string;
  try {
    const r = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|pt-BR`,
    );
    if (!r.ok) return text;
    const json = (await r.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const translated = json.responseData?.translatedText;
    const ok = json.responseStatus === 200 && translated && !/MYMEMORY WARNING/i.test(translated);
    const result = ok ? translated! : text;
    cache.set(key, { at: Date.now(), data: result });
    return result;
  } catch {
    return text;
  }
}

function translateDict(e: Exercise): Exercise {
  return {
    ...e,
    bodyPart: ptTerm(BODYPART_PT, e.bodyPart) ?? e.bodyPart,
    target: ptTerm(TARGET_PT, e.target) ?? e.target,
    equipment: ptTerm(EQUIPMENT_PT, e.equipment) ?? e.equipment,
    difficulty: ptTerm(DIFFICULTY_PT, e.difficulty) ?? e.difficulty,
  };
}

// Músculo secundário: usa o dicionário fixo; se não constar (ex: "hip flexors"), traduz via API.
async function translateMuscle(m: string): Promise<string> {
  const dict = ptTerm(MUSCLE_PT, m);
  if (dict && dict !== m) return dict;
  return translateEN(m);
}

// Tradução "leve": nome + músculos secundários via API (usado nas listas de busca)
async function translateSummary(e: Exercise): Promise<Exercise> {
  const [name, secondaryMuscles] = await Promise.all([
    translateEN(e.name),
    e.secondaryMuscles
      ? Promise.all(e.secondaryMuscles.map(translateMuscle))
      : Promise.resolve(e.secondaryMuscles),
  ]);
  return { ...translateDict(e), name, secondaryMuscles };
}

// Tradução completa (nome + instruções + descrição + músculos secundários), usada na tela de detalhe de 1 exercício por vez
async function translateFull(e: Exercise): Promise<Exercise> {
  const [name, description, instructions, secondaryMuscles] = await Promise.all([
    translateEN(e.name),
    e.description ? translateEN(e.description) : Promise.resolve(e.description),
    e.instructions
      ? Promise.all(e.instructions.map((s) => translateEN(s)))
      : Promise.resolve(e.instructions),
    e.secondaryMuscles
      ? Promise.all(e.secondaryMuscles.map(translateMuscle))
      : Promise.resolve(e.secondaryMuscles),
  ]);
  return { ...translateDict(e), name, description, instructions, secondaryMuscles };
}

export const translateBodyPart = createServerFn({ method: "GET" })
  .inputValidator((d: { term: string }) => z.object({ term: z.string() }).parse(d))
  .handler(({ data }) => PT_BODYPART[data.term.toLowerCase().trim()] ?? null);

// ============ DB-backed queries (fonte principal após sync) ============
async function dbClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function dbHasData(): Promise<boolean> {
  const db = await dbClient();
  const { count } = await db
    .from("exercises_catalog")
    .select("*", { count: "exact", head: true });
  return (count ?? 0) > 0;
}

function rowToExercise(r: any): Exercise {
  return {
    id: r.id,
    name: r.name_pt ?? r.name,
    bodyPart: r.body_part ?? "",
    target: r.target ?? "",
    equipment: r.equipment ?? "",
    difficulty: r.difficulty ?? undefined,
    secondaryMuscles: r.secondary_muscles ?? undefined,
    instructions: r.instructions_pt ?? r.instructions ?? undefined,
    gifUrl: `/api/public/exercise-gif/${r.id}`,
  };
}

export const listBodyParts = createServerFn({ method: "GET" }).handler(async () => {
  if (await dbHasData()) {
    const db = await dbClient();
    const { data } = await db.from("exercises_catalog").select("body_part").not("body_part", "is", null);
    return Array.from(new Set((data ?? []).map((r: any) => r.body_part))).sort();
  }
  return cachedJson<string[]>(`${BASE}/exercises/bodyPartList`);
});

export const listTargets = createServerFn({ method: "GET" }).handler(async () => {
  if (await dbHasData()) {
    const db = await dbClient();
    const { data } = await db.from("exercises_catalog").select("target").not("target", "is", null);
    return Array.from(new Set((data ?? []).map((r: any) => r.target))).sort();
  }
  return cachedJson<string[]>(`${BASE}/exercises/targetList`);
});

export const listEquipments = createServerFn({ method: "GET" }).handler(async () => {
  if (await dbHasData()) {
    const db = await dbClient();
    const { data } = await db.from("exercises_catalog").select("equipment").not("equipment", "is", null);
    return Array.from(new Set((data ?? []).map((r: any) => r.equipment))).sort();
  }
  return cachedJson<string[]>(`${BASE}/exercises/equipmentList`);
});

export const searchExercises = createServerFn({ method: "GET" })
  .inputValidator(
    (d: {
      q?: string;
      bodyPart?: string;
      target?: string;
      equipment?: string;
      limit?: number;
      offset?: number;
    }) =>
      z
        .object({
          q: z.string().max(80).optional(),
          bodyPart: z.string().max(40).optional(),
          target: z.string().max(40).optional(),
          equipment: z.string().max(40).optional(),
          limit: z.number().int().min(1).max(60).optional(),
          offset: z.number().int().min(0).max(2000).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const limit = data.limit ?? 24;
    const offset = data.offset ?? 0;
    let bodyPart = data.bodyPart?.toLowerCase();
    if (bodyPart && PT_BODYPART[bodyPart]) bodyPart = PT_BODYPART[bodyPart];

    if (await dbHasData()) {
      const db = await dbClient();
      let query = db.from("exercises_catalog").select("*");
      if (data.q && data.q.trim()) {
        const q = `%${data.q.trim()}%`;
        query = query.or(`name.ilike.${q},name_pt.ilike.${q}`);
      }
      if (bodyPart) query = query.eq("body_part", bodyPart);
      if (data.target) query = query.eq("target", data.target);
      if (data.equipment) query = query.eq("equipment", data.equipment);
      const { data: rows } = await query
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);
      const rows2 = rows ?? [];
      const items = rows2.map(rowToExercise);
      const translated = await Promise.all(items.map((e) => translateSummary(e)));
      for (const t of translated) {
        const orig = rows2.find((r: any) => r.id === t.id);
        if (orig && t.name !== orig.name) {
          await db.from("exercises_catalog").update({ name_pt: t.name }).eq("id", t.id);
        }
      }
      return translated;
    }

    // fallback API
    let url: string;
    if (data.q && data.q.trim().length > 0) {
      url = `${BASE}/exercises/name/${encodeURIComponent(data.q.trim().toLowerCase())}?limit=${limit}&offset=${offset}`;
    } else if (bodyPart) {
      url = `${BASE}/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}&offset=${offset}`;
    } else if (data.target) {
      url = `${BASE}/exercises/target/${encodeURIComponent(data.target)}?limit=${limit}&offset=${offset}`;
    } else if (data.equipment) {
      url = `${BASE}/exercises/equipment/${encodeURIComponent(data.equipment)}?limit=${limit}&offset=${offset}`;
    } else {
      url = `${BASE}/exercises?limit=${limit}&offset=${offset}`;
    }
    const items = await cachedJson<Exercise[]>(url);
    const translated = await Promise.all(items.map((e) => translateSummary(e)));
    return translated.map((e) => ({ ...e, gifUrl: `/api/public/exercise-gif/${e.id}` }));
  });

export const getExerciseById = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().min(1).max(10) }).parse(d))
  .handler(async ({ data }) => {
    if (await dbHasData()) {
      const db = await dbClient();
      const { data: row } = await db
        .from("exercises_catalog")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (row) {
        const ex = rowToExercise(row);
        const translated = await translateFull(ex);
        const db2 = await dbClient();
        if (translated.name !== row.name) {
          await db2.from("exercises_catalog").update({ name_pt: translated.name }).eq("id", row.id);
        }
        if (translated.instructions && JSON.stringify(translated.instructions) !== JSON.stringify(row.instructions)) {
          await db2.from("exercises_catalog").update({ instructions_pt: translated.instructions }).eq("id", row.id);
        }
        return translated;
      }
    }
    const ex = await cachedJson<Exercise>(
      `${BASE}/exercises/exercise/${encodeURIComponent(data.id)}`,
    );
    const translated = await translateFull(ex);
    return { ...translated, gifUrl: `/api/public/exercise-gif/${translated.id}` };
  });
