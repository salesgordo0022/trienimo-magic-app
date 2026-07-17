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
  last_body: string | null;
  last_at: string | null;
  unread: number;
};

// --- Pessoas com quem posso conversar (meu professor, se eu for aluno; meus alunos, se eu for professor) ---
export const listMyConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: asStudent } = await context.supabase
      .from("teacher_students")
      .select("teacher_id")
      .eq("student_id", context.userId);
    const { data: asTeacher } = await context.supabase
      .from("teacher_students")
      .select("student_id")
      .eq("teacher_id", context.userId);
    const partnerIds = Array.from(
      new Set([
        ...(asStudent ?? []).map((r) => r.teacher_id),
        ...(asTeacher ?? []).map((r) => r.student_id),
      ]),
    );
    if (!partnerIds.length) return [] as ConversationSummary[];

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, nome")
      .in("id", partnerIds);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.nome]));

    const { data: msgs } = await context.supabase
      .from("messages")
      .select("sender_id, recipient_id, body, read_at, created_at")
      .or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(500);

    return partnerIds
      .map((pid) => {
        const related = (msgs ?? []).filter((m) => m.sender_id === pid || m.recipient_id === pid);
        const last = related[0];
        const unread = related.filter(
          (m) => m.recipient_id === context.userId && m.sender_id === pid && !m.read_at,
        ).length;
        return {
          partner_id: pid,
          partner_nome: nameById.get(pid) ?? null,
          last_body: last?.body ?? null,
          last_at: last?.created_at ?? null,
          unread,
        };
      })
      .sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? "")) as ConversationSummary[];
  });

// --- Histórico de uma conversa com uma pessoa específica (e marca como lidas as recebidas) ---
export const listConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { with: string }) => z.object({ with: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
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
      await context.supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);
    }
    return (rows ?? []) as MessageRow[];
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { to: string; body: string }) =>
    z.object({ to: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: m, error } = await context.supabase
      .from("messages")
      .insert({ sender_id: context.userId, recipient_id: data.to, body: data.body })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: m.id };
  });
