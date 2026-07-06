import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AppRole = "admin" | "professor" | "aluno";

export type UserRow = {
  id: string;
  nome: string | null;
  role: AppRole;
  teacher_id: string | null;
  teacher_nome: string | null;
};

async function requireRole(supabase: { rpc: (n: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }, userId: string, role: AppRole) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

// --- Get my role ---
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map(r => r.role as AppRole);
    let role: AppRole = "aluno";
    if (roles.includes("admin")) role = "admin";
    else if (roles.includes("professor")) role = "professor";
    // Teacher (if any)
    const { data: link } = await context.supabase
      .from("teacher_students").select("teacher_id").eq("student_id", context.userId).maybeSingle();
    return { role, teacher_id: (link?.teacher_id ?? null) as string | null };
  });

// --- List all users (admin) ---
export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, "admin");
    const { data: profiles, error } = await context.supabase
      .from("profiles").select("id, nome");
    if (error) throw new Error(error.message);
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const { data: links } = await context.supabase.from("teacher_students").select("student_id, teacher_id");
    const teacherIds = new Set((links ?? []).map(l => l.teacher_id));
    const teacherNames = new Map<string, string>();
    (profiles ?? []).forEach(p => { if (teacherIds.has(p.id)) teacherNames.set(p.id, p.nome ?? ""); });

    return (profiles ?? []).map(p => {
      const userRoles = (roles ?? []).filter(r => r.user_id === p.id).map(r => r.role as AppRole);
      let role: AppRole = "aluno";
      if (userRoles.includes("admin")) role = "admin";
      else if (userRoles.includes("professor")) role = "professor";
      const link = (links ?? []).find(l => l.student_id === p.id);
      return {
        id: p.id, nome: p.nome, role,
        teacher_id: link?.teacher_id ?? null,
        teacher_nome: link?.teacher_id ? (teacherNames.get(link.teacher_id) ?? null) : null,
      } as UserRow;
    });
  });

// --- Set role (admin) ---
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; role: AppRole }) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(["admin","professor","aluno"]) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("set_user_role", { _user_id: data.user_id, _role: data.role });
    if (error) throw new Error(error.message);
    // If demoting from professor, unlink students
    if (data.role !== "professor") {
      await context.supabase.from("teacher_students").delete().eq("teacher_id", data.user_id);
    }
    // If becoming aluno, remove any teacher link (they'll be re-assigned)
    if (data.role !== "aluno") {
      await context.supabase.from("teacher_students").delete().eq("student_id", data.user_id);
    }
    return { ok: true };
  });

// --- Assign student to teacher (admin or the teacher themself) ---
export const assignStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { student_id: string; teacher_id: string | null }) =>
    z.object({ student_id: z.string().uuid(), teacher_id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ context, data }) => {
    await context.supabase.from("teacher_students").delete().eq("student_id", data.student_id);
    if (data.teacher_id) {
      const { error } = await context.supabase.from("teacher_students")
        .insert({ student_id: data.student_id, teacher_id: data.teacher_id });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// --- Invites ---
export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { role: AppRole }) => z.object({ role: z.enum(["admin","professor","aluno"]) }).parse(d))
  .handler(async ({ context, data }) => {
    await requireRole(context.supabase, context.userId, "admin");
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
    const { error } = await context.supabase.from("invites")
      .insert({ code, role: data.role, created_by: context.userId, expires_at: expires });
    if (error) throw new Error(error.message);
    return { code };
  });

export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, "admin");
    const { data, error } = await context.supabase.from("invites")
      .select("id, code, role, used_by, used_at, expires_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireRole(context.supabase, context.userId, "admin");
    const { error } = await context.supabase.from("invites").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Teacher: list my students ---
export const listMyStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: links, error } = await context.supabase
      .from("teacher_students").select("student_id").eq("teacher_id", context.userId);
    if (error) throw new Error(error.message);
    const ids = (links ?? []).map(l => l.student_id);
    if (!ids.length) return [];
    const { data: profiles } = await context.supabase.from("profiles").select("id, nome").in("id", ids);
    return (profiles ?? []) as Array<{ id: string; nome: string | null }>;
  });
