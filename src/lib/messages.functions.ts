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

// --- Listar todos os contatos disponíveis para conversar ---
export const listAvailableContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, nome")
        .neq("id", context.userId);
      return (profiles ?? []).map((p) => ({ id: p.id, nome: p.nome ?? "Contato" }));
    } catch {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, nome")
        .neq("id", context.userId);
      return (profiles ?? []).map((p) => ({ id: p.id, nome: p.nome ?? "Contato" }));
    }
  });

// --- Conversas do usuário (derivado da tabela messages, sem depender de teacher_students) ---
export const listMyConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: msgs, error } = await context.supabase
      .from("messages")
      .select("sender_id, recipient_id, body, read_at, created_at")
      .or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const partnerMap = new Map<string, { body: string | null; at: string | null; unread: number }>();
    for (const m of msgs ?? []) {
      const pid = m.sender_id === context.userId ? m.recipient_id : m.sender_id;
      if (!partnerMap.has(pid)) {
        const unread = (msgs ?? []).filter(
          (x) => x.recipient_id === context.userId && x.sender_id === pid && !x.read_at,
        ).length;
        partnerMap.set(pid, { body: m.body, at: m.created_at, unread });
      }
    }

    const partnerIds = [...partnerMap.keys()];
    if (!partnerIds.length) return [] as ConversationSummary[];

    let nameById = new Map<string, string | null>();
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, nome")
        .in("id", partnerIds);
      nameById = new Map((profiles ?? []).map((p) => [p.id, p.nome]));
    } catch {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, nome")
        .in("id", partnerIds);
      nameById = new Map((profiles ?? []).map((p) => [p.id, p.nome]));
    }

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

// --- Histórico de uma conversa com uma pessoa específica (e marca como lidas as recebidas) ---
export const listConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { with: string }) => z.object({ with: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    let rows: MessageRow[] = [];
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: r, error } = await supabaseAdmin
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .or(
          `and(sender_id.eq.${context.userId},recipient_id.eq.${data.with}),and(sender_id.eq.${data.with},recipient_id.eq.${context.userId})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      rows = (r ?? []) as MessageRow[];
    } catch {
      const { data: r, error } = await context.supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .or(
          `and(sender_id.eq.${context.userId},recipient_id.eq.${data.with}),and(sender_id.eq.${data.with},recipient_id.eq.${context.userId})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      rows = (r ?? []) as MessageRow[];
    }

    const unreadIds = rows
      .filter((m) => m.recipient_id === context.userId && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      } catch {
        await context.supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }
    }
    return rows;
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { to: string; body: string }) =>
    z.object({ to: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: m, error } = await supabaseAdmin
        .from("messages")
        .insert({ sender_id: context.userId, recipient_id: data.to, body: data.body })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: m.id };
    } catch {
      const { data: m, error } = await context.supabase
        .from("messages")
        .insert({ sender_id: context.userId, recipient_id: data.to, body: data.body })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: m.id };
    }
  });
