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
  user_id?: string;
  assigned_to?: string | null;
  assigned_nome?: string | null;
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
  exercise_db_id: string | null;
};

export type GroupWithExercises = {
  id: string;
  nome: string;
  ordem: number;
  exercises: ExerciseRow[];
};

export type FichaFull = {
  workout: WorkoutRow;
  profile: {
    nome: string | null;
    objetivo: string | null;
    dias_semana: string | null;
    observacao: string | null;
    logo_texto: string | null;
    personal_nome: string | null;
  };
  groups: GroupWithExercises[];
};

// --- List workouts owned by me ---
export const listWorkouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workouts")
      .select("id, letra, nome, data_inicio, observacao, ordem, user_id, assigned_to")
      .eq("user_id", context.userId)
      .order("ordem", { ascending: true })
      .order("letra", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const studentIds = Array.from(
      new Set(
        rows.map((w) => w.assigned_to).filter((v): v is string => !!v && v !== context.userId),
      ),
    );
    let nameById = new Map<string, string>();
    if (studentIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, nome")
        .in("id", studentIds);
      nameById = new Map((profs ?? []).map((p) => [p.id, p.nome ?? ""]));
    }
    return rows.map((w) => ({
      ...w,
      assigned_nome:
        w.assigned_to && w.assigned_to !== context.userId
          ? (nameById.get(w.assigned_to) ?? null)
          : null,
    })) as WorkoutRow[];
  });

// --- Fichas prescritas para mim (aluno) ---
export const listAssignedToMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workouts")
      .select("id, letra, nome, data_inicio, observacao, ordem, user_id, assigned_to")
      .eq("assigned_to", context.userId)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    if (!data?.length) return [] as WorkoutRow[];
    const teacherIds = Array.from(new Set(data.map((w) => w.user_id)));
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, nome")
      .in("id", teacherIds);
    return data.map((w) => ({
      ...w,
      assigned_nome: profs?.find((p) => p.id === w.user_id)?.nome ?? null,
    })) as WorkoutRow[];
  });

// --- Fichas que criei para um aluno específico (professor) ---
export const listWorkoutsForStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { student_id: string }) =>
    z.object({ student_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("workouts")
      .select("id, letra, nome, data_inicio, observacao, ordem, user_id, assigned_to")
      .eq("user_id", context.userId)
      .eq("assigned_to", data.student_id)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as WorkoutRow[];
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
    return (
      data ?? {
        nome: null,
        objetivo: null,
        dias_semana: null,
        observacao: null,
        logo_texto: "SuaLogo",
        personal_nome: "SEU NOME - PERSONAL TRAINER",
      }
    );
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      nome?: string;
      objetivo?: string;
      dias_semana?: string;
      observacao?: string;
      logo_texto?: string;
      personal_nome?: string;
    }) =>
      z
        .object({
          nome: z.string().max(120).optional(),
          objetivo: z.string().max(200).optional(),
          dias_semana: z.string().max(200).optional(),
          observacao: z.string().max(500).optional(),
          logo_texto: z.string().max(40).optional(),
          personal_nome: z.string().max(120).optional(),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Create workout ---
export const createWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { letra: string; nome?: string; assigned_to?: string | null }) =>
    z
      .object({
        letra: z.string().min(1).max(3),
        nome: z.string().max(80).optional(),
        assigned_to: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // If prescribing to another user, require professor/admin
    if (data.assigned_to && data.assigned_to !== context.userId) {
      const { data: isProf } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "professor",
      });
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isProf && !isAdmin) throw new Error("Somente professores podem prescrever fichas.");
    }
    const target = data.assigned_to ?? null;
    const { data: countRows } = await context.supabase
      .from("workouts")
      .select("id")
      .eq("user_id", context.userId)
      .eq("assigned_to", target as string);
    const ordem = countRows?.length ?? 0;
    const { data: w, error } = await context.supabase
      .from("workouts")
      .insert({
        user_id: context.userId,
        assigned_to: target,
        letra: data.letra.toUpperCase(),
        nome: data.nome ?? null,
        ordem,
        data_inicio: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const defaultGroups = ["PEITO", "TRÍCEPS", "OMBRO", "ABDOMEN VERTEBRAIS"];
    const groupRows = defaultGroups.map((nome, i) => ({
      workout_id: w.id,
      user_id: context.userId,
      nome,
      ordem: i,
    }));
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
      .from("workouts")
      .select("id, letra, nome, data_inicio, observacao, ordem, assigned_to, user_id")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("nome, objetivo, dias_semana, observacao, logo_texto, personal_nome")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: groups, error: e2 } = await context.supabase
      .from("workout_groups")
      .select("id, nome, ordem")
      .eq("workout_id", data.id)
      .order("ordem", { ascending: true });
    if (e2) throw new Error(e2.message);

    const groupIds = (groups ?? []).map((g) => g.id);
    // select("*") em vez de listar colunas: se exercise_db_id ainda não existir no banco
    // (migration não aplicada), a ficha continua carregando normalmente em vez de quebrar.
    const { data: exs, error: e3 } = groupIds.length
      ? await context.supabase
          .from("exercises")
          .select("*")
          .in("group_id", groupIds)
          .order("ordem", { ascending: true })
      : { data: [], error: null };
    if (e3) throw new Error(e3.message);

    const groupsWith: GroupWithExercises[] = (groups ?? []).map((g) => ({
      ...g,
      exercises: ((exs ?? []) as ExerciseRow[])
        .filter((e) => e.group_id === g.id)
        .map((e) => ({ ...e, exercise_db_id: e.exercise_db_id ?? null })),
    }));

    return {
      workout: workout as WorkoutRow,
      profile: profile ?? {
        nome: null,
        objetivo: null,
        dias_semana: null,
        observacao: null,
        logo_texto: "SuaLogo",
        personal_nome: "SEU NOME - PERSONAL TRAINER",
      },
      groups: groupsWith,
    } as FichaFull;
  });

// --- Update workout header ---
export const updateWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      letra?: string;
      nome?: string;
      data_inicio?: string;
      observacao?: string;
      assigned_to?: string | null;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          letra: z.string().min(1).max(3).optional(),
          nome: z.string().max(80).nullable().optional(),
          data_inicio: z.string().nullable().optional(),
          observacao: z.string().max(500).nullable().optional(),
          assigned_to: z.string().uuid().nullable().optional(),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const payload = { ...rest, ...(rest.letra ? { letra: rest.letra.toUpperCase() } : {}) };
    const { error } = await context.supabase.from("workouts").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Groups ---
export const addGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workout_id: string; nome: string }) =>
    z.object({ workout_id: z.string().uuid(), nome: z.string().min(1).max(60) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase
      .from("workout_groups")
      .select("id")
      .eq("workout_id", data.workout_id);
    const ordem = rows?.length ?? 0;
    const { data: g, error } = await context.supabase
      .from("workout_groups")
      .insert({
        workout_id: data.workout_id,
        user_id: context.userId,
        nome: data.nome.toUpperCase(),
        ordem,
      })
      .select("id")
      .single();
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
  .inputValidator((d: { group_id: string; nome: string; exercise_db_id?: string | null }) =>
    z
      .object({
        group_id: z.string().uuid(),
        nome: z.string().min(1).max(120),
        exercise_db_id: z.string().max(10).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase
      .from("exercises")
      .select("id")
      .eq("group_id", data.group_id);
    const ordem = rows?.length ?? 0;
    const payload = {
      group_id: data.group_id,
      user_id: context.userId,
      nome: data.nome,
      series: 3,
      desc_segundos: 45,
      ordem,
      exercise_db_id: data.exercise_db_id ?? null,
      sets_config: [
        { reps: "10", kg: "" },
        { reps: "10", kg: "" },
        { reps: "10", kg: "" },
        { reps: "", kg: "" },
      ],
    };
    let { data: e, error } = await context.supabase
      .from("exercises")
      .insert(payload)
      .select("id")
      .single();
    if (error?.code === "42703" || error?.code === "PGRST204") {
      // exercise_db_id ainda não existe no banco (migration pendente) — insere sem ele.
      const { exercise_db_id, ...fallback } = payload;
      ({ data: e, error } = await context.supabase
        .from("exercises")
        .insert(fallback)
        .select("id")
        .single());
    }
    if (error) throw new Error(error.message);
    if (!e) throw new Error("Falha ao criar exercício");
    return { id: e.id };
  });

export const updateExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      nome?: string;
      series?: number;
      desc_segundos?: number;
      obs?: string | null;
      sets_config?: Array<{ reps?: string; kg?: string }>;
      exercise_db_id?: string | null;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          nome: z.string().min(1).max(120).optional(),
          series: z.number().int().min(1).max(20).optional(),
          desc_segundos: z.number().int().min(0).max(600).optional(),
          obs: z.string().max(80).nullable().optional(),
          sets_config: z
            .array(
              z.object({ reps: z.string().max(10).optional(), kg: z.string().max(10).optional() }),
            )
            .max(8)
            .optional(),
          exercise_db_id: z.string().max(10).nullable().optional(),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    let { error } = await context.supabase.from("exercises").update(rest).eq("id", id);
    if (error?.code === "42703" || error?.code === "PGRST204") {
      // exercise_db_id ainda não existe no banco (migration pendente) — atualiza sem ele.
      const { exercise_db_id, ...fallback } = rest;
      ({ error } = await context.supabase.from("exercises").update(fallback).eq("id", id));
    }
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
  .inputValidator((d: { workout_id: string }) =>
    z.object({ workout_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: s, error } = await context.supabase
      .from("sessions")
      .insert({ workout_id: data.workout_id, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: s.id };
  });

export const upsertSessionSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      session_id: string;
      exercise_id: string;
      set_index: number;
      reps?: number | null;
      kg?: number | null;
      done: boolean;
    }) =>
      z
        .object({
          session_id: z.string().uuid(),
          exercise_id: z.string().uuid(),
          set_index: z.number().int().min(0).max(20),
          reps: z.number().int().min(0).max(999).nullable().optional(),
          kg: z.number().min(0).max(9999).nullable().optional(),
          done: z.boolean(),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("session_sets")
      .select("id")
      .eq("session_id", data.session_id)
      .eq("exercise_id", data.exercise_id)
      .eq("set_index", data.set_index)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("session_sets")
        .update({ reps: data.reps ?? null, kg: data.kg ?? null, done: data.done })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("session_sets").insert({
        session_id: data.session_id,
        exercise_id: data.exercise_id,
        user_id: context.userId,
        set_index: data.set_index,
        reps: data.reps ?? null,
        kg: data.kg ?? null,
        done: data.done,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const endSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SessionHistory = {
  id: string;
  started_at: string;
  ended_at: string | null;
  sets: Array<{
    exercise_id: string;
    exercise_nome: string;
    set_index: number;
    reps: number | null;
    kg: number | null;
    done: boolean;
  }>;
};

export const getHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workout_id: string }) =>
    z.object({ workout_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: sessions, error } = await context.supabase
      .from("sessions")
      .select("id, started_at, ended_at")
      .eq("workout_id", data.workout_id)
      .order("started_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    const ids = (sessions ?? []).map((s) => s.id);
    if (!ids.length) return [] as SessionHistory[];
    const { data: sets } = await context.supabase
      .from("session_sets")
      .select("session_id, exercise_id, set_index, reps, kg, done, exercises(nome)")
      .in("session_id", ids);
    return (sessions ?? []).map((s) => ({
      ...s,
      sets: (
        (sets ?? []) as Array<{
          session_id: string;
          exercise_id: string;
          set_index: number;
          reps: number | null;
          kg: number | null;
          done: boolean;
          exercises: { nome: string } | null;
        }>
      )
        .filter((x) => x.session_id === s.id)
        .map((x) => ({
          exercise_id: x.exercise_id,
          exercise_nome: x.exercises?.nome ?? "",
          set_index: x.set_index,
          reps: x.reps,
          kg: x.kg,
          done: x.done,
        })),
    })) as SessionHistory[];
  });
