import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type WorkoutRow = {
  id: string;
  letra: string;
  nome: string | null;
  data_inicio: string | null;
  observacao: string | null;
  ordem: number;
};

export type ExerciseRow = {
  id: string;
  group_id: string;
  nome: string;
  series: number;
  desc_segundos: number;
  obs: string | null;
  ordem: number;
  sets_config: Array<{ reps?: string; kg?: string }>;
};

export type GroupWithExercises = {
  id: string;
  nome: string;
  ordem: number;
  exercises: ExerciseRow[];
};

export type FichaFull = {
  workout: WorkoutRow;
  profile: { nome: string | null; objetivo: string | null; dias_semana: string | null; observacao: string | null; logo_texto: string | null; personal_nome: string | null };
  groups: GroupWithExercises[];
};

// --- List workouts ---
export const listWorkouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workouts")
      .select("id, letra, nome, data_inicio, observacao, ordem")
      .order("ordem", { ascending: true })
      .order("letra", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as WorkoutRow[];
  });

// --- Get profile ---
export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("nome, objetivo, dias_semana, observacao, logo_texto, personal_nome")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { nome: null, objetivo: null, dias_semana: null, observacao: null, logo_texto: "SuaLogo", personal_nome: "SEU NOME - PERSONAL TRAINER" };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nome?: string; objetivo?: string; dias_semana?: string; observacao?: string; logo_texto?: string; personal_nome?: string }) =>
    z.object({
      nome: z.string().max(120).optional(),
      objetivo: z.string().max(200).optional(),
      dias_semana: z.string().max(200).optional(),
      observacao: z.string().max(500).optional(),
      logo_texto: z.string().max(40).optional(),
      personal_nome: z.string().max(120).optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("profiles").upsert({ id: context.userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Create workout ---
export const createWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { letra: string; nome?: string }) =>
    z.object({ letra: z.string().min(1).max(3), nome: z.string().max(80).optional() }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { data: countRows } = await context.supabase.from("workouts").select("id").eq("user_id", context.userId);
    const ordem = countRows?.length ?? 0;
    const { data: w, error } = await context.supabase
      .from("workouts")
      .insert({ user_id: context.userId, letra: data.letra.toUpperCase(), nome: data.nome ?? null, ordem, data_inicio: new Date().toISOString().slice(0, 10) })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const defaultGroups = ["PEITO", "TRÍCEPS", "OMBRO", "ABDOMEN VERTEBRAIS"];
    const groupRows = defaultGroups.map((nome, i) => ({ workout_id: w.id, user_id: context.userId, nome, ordem: i }));
    await context.supabase.from("workout_groups").insert(groupRows);
    return { id: w.id };
  });

export const deleteWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("workouts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Get full ficha ---
export const getFicha = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: workout, error: e1 } = await context.supabase
      .from("workouts").select("id, letra, nome, data_inicio, observacao, ordem")
      .eq("id", data.id).single();
    if (e1) throw new Error(e1.message);

    const { data: profile } = await context.supabase
      .from("profiles").select("nome, objetivo, dias_semana, observacao, logo_texto, personal_nome")
      .eq("id", context.userId).maybeSingle();

    const { data: groups, error: e2 } = await context.supabase
      .from("workout_groups").select("id, nome, ordem")
      .eq("workout_id", data.id).order("ordem", { ascending: true });
    if (e2) throw new Error(e2.message);

    const groupIds = (groups ?? []).map(g => g.id);
    const { data: exs, error: e3 } = groupIds.length
      ? await context.supabase.from("exercises")
          .select("id, group_id, nome, series, desc_segundos, obs, ordem, sets_config")
          .in("group_id", groupIds).order("ordem", { ascending: true })
      : { data: [], error: null };
    if (e3) throw new Error(e3.message);

    const groupsWith: GroupWithExercises[] = (groups ?? []).map(g => ({
      ...g,
      exercises: ((exs ?? []) as ExerciseRow[]).filter(e => e.group_id === g.id),
    }));

    return {
      workout: workout as WorkoutRow,
      profile: profile ?? { nome: null, objetivo: null, dias_semana: null, observacao: null, logo_texto: "SuaLogo", personal_nome: "SEU NOME - PERSONAL TRAINER" },
      groups: groupsWith,
    } as FichaFull;
  });

// --- Update workout header ---
export const updateWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; letra?: string; nome?: string; data_inicio?: string; observacao?: string }) =>
    z.object({
      id: z.string().uuid(),
      letra: z.string().min(1).max(3).optional(),
      nome: z.string().max(80).nullable().optional(),
      data_inicio: z.string().nullable().optional(),
      observacao: z.string().max(500).nullable().optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const payload: Record<string, unknown> = { ...rest };
    if (payload.letra) payload.letra = String(payload.letra).toUpperCase();
    const { error } = await context.supabase.from("workouts").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Groups ---
export const addGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workout_id: string; nome: string }) =>
    z.object({ workout_id: z.string().uuid(), nome: z.string().min(1).max(60) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase.from("workout_groups").select("id").eq("workout_id", data.workout_id);
    const ordem = rows?.length ?? 0;
    const { data: g, error } = await context.supabase
      .from("workout_groups")
      .insert({ workout_id: data.workout_id, user_id: context.userId, nome: data.nome.toUpperCase(), ordem })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: g.id };
  });

export const deleteGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("workout_groups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Exercises ---
export const addExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { group_id: string; nome: string }) =>
    z.object({ group_id: z.string().uuid(), nome: z.string().min(1).max(120) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase.from("exercises").select("id").eq("group_id", data.group_id);
    const ordem = rows?.length ?? 0;
    const { data: e, error } = await context.supabase
      .from("exercises")
      .insert({
        group_id: data.group_id, user_id: context.userId, nome: data.nome,
        series: 3, desc_segundos: 45, ordem,
        sets_config: [{ reps: "10", kg: "" }, { reps: "10", kg: "" }, { reps: "10", kg: "" }, { reps: "", kg: "" }],
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: e.id };
  });

export const updateExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; nome?: string; series?: number; desc_segundos?: number; obs?: string | null; sets_config?: Array<{ reps?: string; kg?: string }> }) =>
    z.object({
      id: z.string().uuid(),
      nome: z.string().min(1).max(120).optional(),
      series: z.number().int().min(1).max(20).optional(),
      desc_segundos: z.number().int().min(0).max(600).optional(),
      obs: z.string().max(80).nullable().optional(),
      sets_config: z.array(z.object({ reps: z.string().max(10).optional(), kg: z.string().max(10).optional() })).max(8).optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("exercises").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("exercises").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Sessions / execução ---
export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workout_id: string }) => z.object({ workout_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: s, error } = await context.supabase
      .from("sessions")
      .insert({ workout_id: data.workout_id, user_id: context.userId })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: s.id };
  });

export const upsertSessionSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { session_id: string; exercise_id: string; set_index: number; reps?: number | null; kg?: number | null; done: boolean }) =>
    z.object({
      session_id: z.string().uuid(),
      exercise_id: z.string().uuid(),
      set_index: z.number().int().min(0).max(20),
      reps: z.number().int().min(0).max(999).nullable().optional(),
      kg: z.number().min(0).max(9999).nullable().optional(),
      done: z.boolean(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("session_sets").select("id")
      .eq("session_id", data.session_id).eq("exercise_id", data.exercise_id).eq("set_index", data.set_index)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase.from("session_sets")
        .update({ reps: data.reps ?? null, kg: data.kg ?? null, done: data.done })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("session_sets").insert({
        session_id: data.session_id, exercise_id: data.exercise_id, user_id: context.userId,
        set_index: data.set_index, reps: data.reps ?? null, kg: data.kg ?? null, done: data.done,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const endSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SessionHistory = {
  id: string;
  started_at: string;
  ended_at: string | null;
  sets: Array<{ exercise_id: string; exercise_nome: string; set_index: number; reps: number | null; kg: number | null; done: boolean }>;
};

export const getHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workout_id: string }) => z.object({ workout_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: sessions, error } = await context.supabase
      .from("sessions").select("id, started_at, ended_at")
      .eq("workout_id", data.workout_id)
      .order("started_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    const ids = (sessions ?? []).map(s => s.id);
    if (!ids.length) return [] as SessionHistory[];
    const { data: sets } = await context.supabase
      .from("session_sets")
      .select("session_id, exercise_id, set_index, reps, kg, done, exercises(nome)")
      .in("session_id", ids);
    return (sessions ?? []).map(s => ({
      ...s,
      sets: ((sets ?? []) as Array<{ session_id: string; exercise_id: string; set_index: number; reps: number | null; kg: number | null; done: boolean; exercises: { nome: string } | null }>)
        .filter(x => x.session_id === s.id)
        .map(x => ({ exercise_id: x.exercise_id, exercise_nome: x.exercises?.nome ?? "", set_index: x.set_index, reps: x.reps, kg: x.kg, done: x.done })),
    })) as SessionHistory[];
  });
