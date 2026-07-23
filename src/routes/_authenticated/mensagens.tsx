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
import { MessageSquare, Send, ArrowLeft, Loader2, UserPlus } from "lucide-react";
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
      partner_role: "admin" as string,
      last_body: null,
      last_at: null,
      unread: 0,
    })),
  ].sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""));

  if (isLoading) {
    return (
      <div className="p-16 flex items-center justify-center text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Carregando...
      </div>
    );
  }

  if (!conversations?.length && !contacts?.length) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto text-center py-16">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center mb-4">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-black text-white mb-1">Mensagens</h1>
        <p className="text-sm text-zinc-500">
          {isAluno
            ? "Você ainda não tem um professor ou admin vinculado."
            : "Você ainda não tem alunos vinculados."}
        </p>
      </div>
    );
  }

  const activeConv = active ? allConversations.find((c) => c.partner_id === active) : undefined;
  const showList = !isAluno || allConversations.length > 1;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {!active ? (
        <div className="space-y-4">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black leading-tight">Mensagens</h1>
                <p className="text-xs text-zinc-500">
                  Converse com {isAluno ? "seu professor ou admin" : "seus alunos"}
                </p>
              </div>
            </div>
          </header>

          <div className="rounded-2xl border border-white/10 bg-[#111112] divide-y divide-white/5 overflow-hidden">
            {allConversations.map((c) => (
              <button
                key={c.partner_id}
                onClick={() => setActive(c.partner_id)}
                className="w-full text-left p-4 flex items-center gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--lime)] to-[#88b800] flex items-center justify-center text-black font-black text-xs shrink-0">
                  {(c.partner_nome ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {c.partner_nome ?? "Sem nome"}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {c.last_body ?? "Clique para conversar"}
                  </div>
                </div>
                {c.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-[var(--lime)] text-black text-[10px] font-black flex items-center justify-center shrink-0">
                    {c.unread}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Thread
          partnerId={active}
          partnerNome={activeConv?.partner_nome ?? null}
          onBack={showList ? () => setActive(null) : undefined}
        />
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
  onBack?: () => void;
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

  return (
    <div className="flex flex-col h-[calc(100vh-190px)]">
      <header className="flex items-center gap-2 pb-3 border-b border-white/5 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--lime)] to-[#88b800] flex items-center justify-center text-black font-black text-xs shrink-0">
          {(partnerNome ?? "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="text-sm font-semibold text-white">{partnerNome ?? "Conversa"}</div>
      </header>
      <div className="flex-1 overflow-y-auto py-4 space-y-2">
        {(messages ?? []).length === 0 && (
          <div className="text-center text-xs text-zinc-500 py-8">Envie a primeira mensagem.</div>
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
        className="flex gap-2 pt-2 border-t border-white/5 shrink-0"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60"
        />
        <button
          type="submit"
          disabled={send.isPending || !body.trim()}
          className="w-10 h-10 rounded-xl bg-[var(--lime)] text-black flex items-center justify-center disabled:opacity-50 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
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
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${isMine ? "bg-[var(--lime)] text-black" : "bg-white/[0.06] text-white border border-white/10"}`}
      >
        <div className="whitespace-pre-wrap break-words">{msg.body}</div>
        <div className={`text-[10px] mt-0.5 ${isMine ? "text-black/50" : "text-zinc-500"}`}>
          {time}
        </div>
      </div>
    </div>
  );
}
