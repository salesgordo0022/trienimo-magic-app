import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type ConversationSummary = {
  partner_id: string;
  partner_nome: string | null;
  partner_role: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: number;
};

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function getUserRole(userId: string): Promise<"admin" | "professor" | "aluno"> {
  const admin = await getAdmin();
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("professor")) return "professor";
  return "aluno";
}

async function getStaffIds(): Promise<string[]> {
  const admin = await getAdmin();
  const { data } = await admin
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["professor", "admin"]);
  const unique = [...new Set((data ?? []).map((r) => r.user_id))];
  return unique;
}

async function getLinkedStudentIds(teacherId: string): Promise<string[]> {
  const admin = await getAdmin();
  const { data } = await admin
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId);
  return (data ?? []).map((l) => l.student_id);
}

// --- Listar contatos disponíveis (por papel) ---
export const listAvailableContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin();
    const role = await getUserRole(context.userId);

    let targetIds: string[] = [];

    if (role === "admin") {
      // Admin vê todos os profiles (exceto ele mesmo)
      const { data: all } = await admin
        .from("profiles")
        .select("id")
        .neq("id", context.userId);
      targetIds = (all ?? []).map((p) => p.id);
    } else if (role === "professor") {
      // Professor vê seus alunos vinculados
      targetIds = await getLinkedStudentIds(context.userId);
    } else {
      // Aluno vê TODOS os professores e admins do sistema
      targetIds = await getStaffIds();
      targetIds = targetIds.filter((id) => id !== context.userId);
    }

    if (!targetIds.length) return [];

    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, nome")
      .in("id", targetIds);
    if (error) throw new Error(error.message);
    return (profiles ?? []).map((p) => ({ id: p.id, nome: p.nome ?? "Contato" }));
  });

// --- Conversas do usuário (filtradas por papel) ---
export const listMyConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin();
    const role = await getUserRole(context.userId);

    // IDs de contatos válidos
    let validContactIds: Set<string> | null = null;
    if (role === "admin") {
      validContactIds = null; // null = sem filtro, admin vê todos
    } else if (role === "professor") {
      const studentIds = await getLinkedStudentIds(context.userId);
      validContactIds = new Set(studentIds);
    } else {
      // Aluno: conversas com QUALQUER professor ou admin
      const staffIds = await getStaffIds();
      validContactIds = new Set(staffIds);
    }

    const { data: msgs, error } = await admin
      .from("messages")
      .select("sender_id, recipient_id, body, read_at, created_at")
      .or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const partnerMap = new Map<string, { body: string | null; at: string | null; unread: number }>();
    for (const m of msgs ?? []) {
      const pid = m.sender_id === context.userId ? m.recipient_id : m.sender_id;
      // Filtrar: só mostrar contatos do papel certo
      if (validContactIds && !validContactIds.has(pid)) continue;
      if (!partnerMap.has(pid)) {
        const unread = (msgs ?? []).filter(
          (x) => x.recipient_id === context.userId && x.sender_id === pid && !x.read_at,
        ).length;
        partnerMap.set(pid, { body: m.body, at: m.created_at, unread });
      }
    }

    const partnerIds = [...partnerMap.keys()];
    if (!partnerIds.length) return [] as ConversationSummary[];

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nome")
      .in("id", partnerIds);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.nome]));

    return partnerIds
      .map((pid) => {
        const info = partnerMap.get(pid)!;
        return {
          partner_id: pid,
          partner_nome: nameById.get(pid) ?? null,
          partner_role: null,
          last_body: info.body,
          last_at: info.at,
          unread: info.unread,
        };
      })
      .sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? "")) as ConversationSummary[];
  });

// --- Histórico de uma conversa ---
export const listConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { with: string }) => z.object({ with: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const admin = await getAdmin();
    const { data: rows, error } = await admin
      .from("messages")
      .select("id, sender_id, recipient_id, body, read_at, created_at")
      .or(
        `and(sender_id.eq.${context.userId},recipient_id.eq.${data.with}),and(sender_id.eq.${data.with},recipient_id.eq.${context.userId})`,
      )
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);

    const unreadIds = (rows ?? [])
      .filter((m) => m.recipient_id === context.userId && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length) {
      await admin
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);
    }
    return (rows ?? []) as MessageRow[];
  });

// --- Enviar mensagem ---
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { to: string; body: string }) =>
    z.object({ to: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const admin = await getAdmin();
    const { data: m, error } = await admin
      .from("messages")
      .insert({ sender_id: context.userId, recipient_id: data.to, body: data.body })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: m.id };
  });
