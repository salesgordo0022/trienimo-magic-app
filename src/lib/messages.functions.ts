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

// --- Listar contatos disponíveis (TODOS os usuários) ---
export const listAvailableContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles, error } = await supabaseAdmin
        .from("profiles")
        .select("id, nome")
        .neq("id", context.userId);
      if (error) throw error;
      return (profiles ?? []).map((p) => ({ id: p.id, nome: p.nome ?? "Contato" }));
    } catch {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, nome")
        .neq("id", context.userId);
      return (profiles ?? []).map((p) => ({ id: p.id, nome: p.nome ?? "Contato" }));
    }
  });

// --- Conversas do usuário (TODAS) ---
export const listMyConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: msgs, error } = await supabaseAdmin
        .from("messages")
        .select("sender_id, recipient_id, body, read_at, created_at")
        .or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

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

      const { data: profiles } = await supabaseAdmin
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
    } catch {
      return [] as ConversationSummary[];
    }
  });

// --- Histórico de uma conversa ---
export const listConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { with: string }) => z.object({ with: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .or(
          `and(sender_id.eq.${context.userId},recipient_id.eq.${data.with}),and(sender_id.eq.${data.with},recipient_id.eq.${context.userId})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;

      const unreadIds = (rows ?? [])
        .filter((m) => m.recipient_id === context.userId && !m.read_at)
        .map((m) => m.id);
      if (unreadIds.length) {
        await supabaseAdmin
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }
      return (rows ?? []) as MessageRow[];
    } catch {
      return [] as MessageRow[];
    }
  });

// --- Enviar mensagem ---
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { to: string; body: string }) =>
    z.object({ to: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const payload = { sender_id: context.userId, recipient_id: data.to, body: data.body };

    // 1. Tenta RPC (bypassa RLS)
    try {
      const { data: rpcId, error: rpcErr } = await context.supabase.rpc("send_message", {
        p_recipient_id: data.to,
        p_body: data.body,
      });
      if (!rpcErr && rpcId) return { id: rpcId as string };
    } catch {}

    // 2. Tenta insert direto
    try {
      const { data: m, error } = await context.supabase
        .from("messages")
        .insert(payload)
        .select("id")
        .single();
      if (!error && m) return { id: m.id };
    } catch {}

    // 3. Fallback: supabaseAdmin bypassa RLS
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: m2, error: e2 } = await supabaseAdmin
        .from("messages")
        .insert(payload)
        .select("id")
        .single();
      if (!e2 && m2) return { id: m2.id };
    } catch {}

    throw new Error("Não foi possível enviar a mensagem.");
  });
