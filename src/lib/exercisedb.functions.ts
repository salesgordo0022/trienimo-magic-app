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

const DIFFICULTY_PT: Record<string, string> = {
  beginner: "iniciante",
  intermediate: "intermediário",
  expert: "avançado",
};

function ptTerm(map: Record<string, string>, term?: string): string | undefined {
  if (!term) return term;
  return map[term.toLowerCase().trim()] ?? term;
}

// Tradução de texto livre (nome, instruções, descrição) via MyMemory (gratuita, sem chave)
async function translateEN(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
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
    name: r.name,
    bodyPart: r.body_part ?? "",
    target: r.target ?? "",
    equipment: r.equipment ?? "",
    difficulty: r.difficulty ?? undefined,
    secondaryMuscles: r.secondary_muscles ?? undefined,
    instructions: r.instructions ?? undefined,
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
      if (data.q && data.q.trim()) query = query.ilike("name", `%${data.q.trim()}%`);
      if (bodyPart) query = query.eq("body_part", bodyPart);
      if (data.target) query = query.eq("target", data.target);
      if (data.equipment) query = query.eq("equipment", data.equipment);
      const { data: rows } = await query
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);
      const items = (rows ?? []).map(rowToExercise);
      return await Promise.all(items.map((e) => translateSummary(e)));
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
        return await translateFull(ex);
      }
    }
    const ex = await cachedJson<Exercise>(
      `${BASE}/exercises/exercise/${encodeURIComponent(data.id)}`,
    );
    const translated = await translateFull(ex);
    return { ...translated, gifUrl: `/api/public/exercise-gif/${translated.id}` };
  });
