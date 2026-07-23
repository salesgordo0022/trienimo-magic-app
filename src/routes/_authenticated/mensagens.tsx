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
import { MessageSquare, Send, ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Carregando...
      </div>
    );
  }

  const activeConv = active ? allConversations.find((c) => c.partner_id === active) : undefined;

  if (active && activeConv) {
    return (
      <Thread
        partnerId={active}
        partnerNome={activeConv.partner_nome ?? null}
        onBack={() => setActive(null)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--lime)]/15 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-[var(--lime)]" />
        </div>
        <div>
          <h1 className="text-lg font-black text-white leading-tight">Mensagens</h1>
          <p className="text-[11px] text-zinc-500">
            {isAluno ? "Converse com seu personal" : "Converse com seus alunos"}
          </p>
        </div>
      </div>

      {allConversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <MessageSquare className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {isAluno
              ? "Nenhum personal encontrado. Aguarde seu professor ser vinculado."
              : "Nenhum aluno vinculado ainda."}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {allConversations.map((c) => {
            const initials = (c.partner_nome ?? "?")
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();
            const time = c.last_at
              ? new Date(c.last_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            return (
              <button
                key={c.partner_id}
                onClick={() => setActive(c.partner_id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--lime)] to-[#6a9c00] flex items-center justify-center text-black font-black text-sm shrink-0 shadow-lg shadow-[var(--lime)]/10">
                  {initials}
                </div>
                <div className="flex-1 min-w-0 border-b border-white/5 pb-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-white truncate">
                      {c.partner_nome ?? "Sem nome"}
                    </span>
                    {time && (
                      <span className="text-[10px] text-zinc-500 shrink-0 ml-2">{time}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 truncate">
                      {c.last_body ?? "Toque para conversar"}
                    </span>
                    {c.unread > 0 && (
                      <span className="ml-2 w-5 h-5 rounded-full bg-[var(--lime)] text-black text-[10px] font-black flex items-center justify-center shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
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
  onBack,
}: {
  partnerId: string;
  partnerNome: string | null;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const { data: me } = useQuery(meQO());
  const { data: messages } = useQuery({
    queryKey: ["conversation", partnerId],
    queryFn: () => listConversation({ data: { with: partnerId } }),
    refetchInterval: 4000,
  });
  const [body, setBody] = useState("");
  const send = useMutation({
    mutationFn: useServerFn(sendMessage),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["conversation", partnerId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  const initials = (partnerNome ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      <header className="px-3 py-3 flex items-center gap-3 border-b border-white/5 shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--lime)] to-[#6a9c00] flex items-center justify-center text-black font-black text-xs shrink-0">
          {initials}
        </div>
        <div>
          <div className="text-sm font-bold text-white">{partnerNome ?? "Conversa"}</div>
          <div className="text-[10px] text-zinc-500">online</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
        {(messages ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Send className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-500">Envie a primeira mensagem</p>
          </div>
        )}
        {(messages ?? []).map((m) => (
          <MessageBubble key={m.id} msg={m} isMine={m.sender_id === me} />
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          send.mutate({ data: { to: partnerId, body: body.trim() } });
        }}
        className="px-3 py-3 border-t border-white/5 shrink-0"
      >
        <div className="flex items-center gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Mensagem..."
            className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[var(--lime)]/50 transition-colors"
          />
          <button
            type="submit"
            disabled={send.isPending || !body.trim()}
            className="w-10 h-10 rounded-full bg-[var(--lime)] text-black flex items-center justify-center disabled:opacity-30 shrink-0 transition-opacity"
          >
            <Send className="w-4 h-4" />
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
        className={`max-w-[75%] rounded-2xl px-3 py-2 ${
          isMine
            ? "bg-[var(--lime)] text-black rounded-br-md"
            : "bg-white/[0.07] text-white border border-white/[0.06] rounded-bl-md"
        }`}
      >
        <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.body}</div>
        <div className={`text-[9px] mt-0.5 text-right ${isMine ? "text-black/40" : "text-zinc-600"}`}>
          {time}
        </div>
      </div>
    </div>
  );
}
