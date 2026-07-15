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

// PT -> EN body part mapping
const PT_BODYPART: Record<string, string> = {
  "peito": "chest", "chest": "chest",
  "costas": "back", "back": "back",
  "ombro": "shoulders", "ombros": "shoulders", "shoulders": "shoulders",
  "biceps": "upper arms", "bíceps": "upper arms", "triceps": "upper arms", "tríceps": "upper arms",
  "braco": "upper arms", "braço": "upper arms", "bracos": "upper arms",
  "antebraco": "lower arms", "antebraço": "lower arms",
  "perna": "upper legs", "pernas": "upper legs", "quadriceps": "upper legs", "quadríceps": "upper legs", "posterior": "upper legs", "gluteo": "upper legs", "glúteo": "upper legs",
  "panturrilha": "lower legs",
  "abdomen": "waist", "abdômen": "waist", "abs": "waist", "core": "waist",
  "cardio": "cardio", "pescoco": "neck", "pescoço": "neck",
};

export const translateBodyPart = createServerFn({ method: "GET" })
  .inputValidator((d: { term: string }) => z.object({ term: z.string() }).parse(d))
  .handler(({ data }) => PT_BODYPART[data.term.toLowerCase().trim()] ?? null);

export const listBodyParts = createServerFn({ method: "GET" }).handler(async () =>
  cachedJson<string[]>(`${BASE}/exercises/bodyPartList`)
);

export const listTargets = createServerFn({ method: "GET" }).handler(async () =>
  cachedJson<string[]>(`${BASE}/exercises/targetList`)
);

export const listEquipments = createServerFn({ method: "GET" }).handler(async () =>
  cachedJson<string[]>(`${BASE}/exercises/equipmentList`)
);

export const searchExercises = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; bodyPart?: string; target?: string; equipment?: string; limit?: number; offset?: number }) =>
    z.object({
      q: z.string().max(80).optional(),
      bodyPart: z.string().max(40).optional(),
      target: z.string().max(40).optional(),
      equipment: z.string().max(40).optional(),
      limit: z.number().int().min(1).max(60).optional(),
      offset: z.number().int().min(0).max(2000).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const limit = data.limit ?? 24;
    const offset = data.offset ?? 0;
    let url: string;
    // try translate PT term if bodyPart looks portuguese
    let bodyPart = data.bodyPart?.toLowerCase();
    if (bodyPart && PT_BODYPART[bodyPart]) bodyPart = PT_BODYPART[bodyPart];

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
    // attach proxied gif url so client never sees the api key
    return items.map(e => ({ ...e, gifUrl: `/api/public/exercise-gif/${e.id}` }));
  });

export const getExerciseById = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().min(1).max(10) }).parse(d))
  .handler(async ({ data }) => {
    const ex = await cachedJson<Exercise>(`${BASE}/exercises/exercise/${encodeURIComponent(data.id)}`);
    return { ...ex, gifUrl: `/api/public/exercise-gif/${ex.id}` };
  });
