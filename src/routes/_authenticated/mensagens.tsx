import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyConversations,
  listAvailableContacts,
  listConversation,
  sendMessage,
  type MessageRow,
} from "@/lib/messages.functions";
import { getMyRole } from "@/lib/roles.functions";
import { supabase } from "@/integrations/supabase/client";
import { Send, ArrowLeft, Loader2, Search, MoreVertical, Check, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mensagens")({
  component: Mensagens,
});

const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });
const meQO = () =>
  queryOptions({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: Infinity,
  });
const conversationsQO = () =>
  queryOptions({
    queryKey: ["conversations"],
    queryFn: () => listMyConversations(),
    refetchInterval: 6000,
  });
const contactsQO = () =>
  queryOptions({
    queryKey: ["availableContacts"],
    queryFn: () => listAvailableContacts(),
  });

function Mensagens() {
  const { data: role } = useQuery(roleQO());
  const { data: conversations, isLoading: convLoading } = useQuery(conversationsQO());
  const { data: contacts, isLoading: contactsLoading } = useQuery(contactsQO());
  const [active, setActive] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isAluno = role?.role === "aluno";
  const isLoading = convLoading || contactsLoading;

  const contactsNotInConversations = (contacts ?? []).filter(
    (c) => !(conversations ?? []).some((conv) => conv.partner_id === c.id),
  );

  const allConversations = [
    ...(conversations ?? []),
    ...contactsNotInConversations.map((c) => ({
      partner_id: c.id,
      partner_nome: c.nome,
      partner_role: null,
      last_body: null,
      last_at: null,
      unread: 0,
    })),
  ].sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""));

  const filtered = search.trim()
    ? allConversations.filter((c) =>
        (c.partner_nome ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : allConversations;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--lime)] border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-500">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  const activeConv = active ? allConversations.find((c) => c.partner_id === active) : undefined;

  if (active && activeConv) {
    return (
      <Thread
        partnerId={active}
        partnerNome={activeConv.partner_nome ?? null}
        partnerInitials={getInitials(activeConv.partner_nome)}
        onBack={() => setActive(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a]">
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <h1 className="text-lg font-black text-white tracking-tight">Mensagens</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {allConversations.length} {allConversations.length === 1 ? "contato" : "contatos"} disponível{allConversations.length !== 1 ? "is" : ""}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0">
            <MoreVertical className="w-4 h-4 text-zinc-400" />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[var(--lime)]/30 transition-colors"
          />
        </div>
      </div>

      {/* Conversation list */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4 border border-white/[0.04]">
            <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </div>
          <p className="text-sm text-zinc-400 font-medium mb-1">Nenhuma conversa</p>
          <p className="text-xs text-zinc-600 max-w-[240px]">
            Selecione um contato para iniciar uma conversa
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c, i) => {
            const initials = getInitials(c.partner_nome);
            const time = c.last_at ? formatTime(c.last_at) : "";
            const date = c.last_at ? formatDate(c.last_at) : "";
            const hasUnread = c.unread > 0;
            const showDate = i === 0 || (c.last_at && filtered[i - 1]?.last_at && date !== formatDate(filtered[i - 1].last_at));

            return (
              <div key={c.partner_id}>
                {showDate && date && (
                  <div className="px-4 py-2">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{date}</span>
                  </div>
                )}
                <button
                  onClick={() => setActive(c.partner_id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] active:bg-white/[0.04] transition-all duration-150"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${hasUnread ? 'bg-gradient-to-br from-[var(--lime)] to-[#8ab800] text-black shadow-lg shadow-[var(--lime)]/20' : 'bg-white/[0.06] text-zinc-400 border border-white/[0.06]'}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0 border-b border-white/[0.04] pb-3">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate ${hasUnread ? 'font-bold text-white' : 'font-semibold text-zinc-200'}`}>
                        {c.partner_nome ?? "Sem nome"}
                      </span>
                      {time && (
                        <span className={`text-[10px] shrink-0 ml-2 ${hasUnread ? 'text-[var(--lime)] font-semibold' : 'text-zinc-500'}`}>{time}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs truncate ${hasUnread ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {c.last_body ?? "Toque para conversar"}
                      </span>
                      {hasUnread && (
                        <span className="w-5 h-5 rounded-full bg-[var(--lime)] text-black text-[10px] font-black flex items-center justify-center shrink-0">
                          {c.unread > 9 ? "9+" : c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Thread({
  partnerId,
  partnerNome,
  partnerInitials,
  onBack,
}: {
  partnerId: string;
  partnerNome: string | null;
  partnerInitials: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const { data: me } = useQuery(meQO());
  const { data: messages, isLoading: msgLoading } = useQuery({
    queryKey: ["conversation", partnerId],
    queryFn: () => listConversation({ data: { with: partnerId } }),
    refetchInterval: 4000,
  });
  const [body, setBody] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const send = useMutation({
    mutationFn: useServerFn(sendMessage),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["conversation", partnerId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      inputRef.current?.focus();
    },
    onError: (e) => toast.error(e.message),
  });
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  const groupedMessages = useMemo(() => {
    const msgs = messages ?? [];
    const groups: { date: string; items: MessageRow[] }[] = [];
    let current: { date: string; items: MessageRow[] } | null = null;

    for (const m of msgs) {
      const d = new Date(m.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      if (!current || current.date !== d) {
        current = { date: d, items: [] };
        groups.push(current);
      }
      current.items.push(m);
    }
    return groups;
  }, [messages?.length]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-3 py-3 flex items-center gap-3 bg-[#0f0f0f] border-b border-white/[0.04]">
        <button
          onClick={onBack}
          className="p-2 -ml-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-400 font-black text-xs shrink-0">
          {partnerInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{partnerNome ?? "Conversa"}</div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-zinc-500">online</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {msgLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--lime)] border-t-transparent animate-spin" />
          </div>
        ) : (messages ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mb-3 border border-white/[0.04]">
              <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400 font-medium mb-1">Inicie a conversa</p>
            <p className="text-xs text-zinc-600">Envie a primeira mensagem para {partnerNome}</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center py-2">
                <span className="text-[10px] font-medium text-zinc-500 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.04]">
                  {group.date}
                </span>
              </div>
              <div className="space-y-1">
                {group.items.map((m) => (
                  <MessageBubble key={m.id} msg={m} isMine={m.sender_id === me} />
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim() || send.isPending) return;
          send.mutate({ data: { to: partnerId, body: body.trim() } });
        }}
        className="shrink-0 px-3 py-2.5 bg-[#0f0f0f] border-t border-white/[0.04] safe-bottom"
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0 relative">
            <input
              ref={inputRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (body.trim() && !send.isPending) {
                    send.mutate({ data: { to: partnerId, body: body.trim() } });
                  }
                }
              }}
              placeholder="Digite sua mensagem..."
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[var(--lime)]/30 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={send.isPending || !body.trim()}
            className="w-11 h-11 rounded-full bg-[var(--lime)] text-black flex items-center justify-center disabled:opacity-20 shrink-0 transition-all duration-200 hover:brightness-110 active:scale-95"
          >
            {send.isPending ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ msg, isMine }: { msg: MessageRow; isMine: boolean }) {
  const time = new Date(msg.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-3 py-2 ${
          isMine
            ? "bg-[var(--lime)] text-black rounded-2xl rounded-br-md"
            : "bg-white/[0.06] text-white border border-white/[0.06] rounded-2xl rounded-bl-md"
        }`}
      >
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words word-break-all">{msg.body}</p>
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine ? "text-black/30" : "text-zinc-600"}`}>
          <span className="text-[9px]">{time}</span>
          {isMine && <CheckCheck className="w-3 h-3" />}
        </div>
      </div>
    </div>
  );
}

function getInitials(name: string | null): string {
  return (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) {
    return d.toLocaleDateString("pt-BR", { weekday: "short" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
