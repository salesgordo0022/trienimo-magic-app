import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, updateProfile, getAllSessions } from "@/lib/workouts.functions";
import type { AllSessionHistory } from "@/lib/workouts.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Save, TrendingUp, ChevronDown, ChevronUp, CheckCircle2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const profileQO = () => queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });
const sessionsQO = () => queryOptions({ queryKey: ["allSessions"], queryFn: () => getAllSessions() });

export const Route = createFileRoute("/_authenticated/perfil")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(profileQO());
    context.queryClient.ensureQueryData(sessionsQO());
  },
  component: Perfil,
});

function Perfil() {
  const { data: profile } = useSuspenseQuery(profileQO());
  const { data: sessions } = useSuspenseQuery(sessionsQO());
  const qc = useQueryClient();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const navigate = useNavigate();
  const logout = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const [form, setForm] = useState({
    nome: profile.nome ?? "",
    objetivo: profile.objetivo ?? "",
    dias_semana: profile.dias_semana ?? "",
    observacao: profile.observacao ?? "",
    personal_nome: profile.personal_nome ?? "",
    altura: (profile as any).altura ?? "",
    peso: (profile as any).peso ?? "",
  });

  const save = useMutation({
    mutationFn: useServerFn(updateProfile),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Perfil salvo"); },
  });

  const update = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const totalSessions = sessions?.length ?? 0;
  const totalDone = sessions?.reduce((acc, s) => acc + s.sets.filter(x => x.done).length, 0) ?? 0;
  const totalKg = sessions?.reduce((acc, s) => acc + s.sets.reduce((a, x) => a + (x.kg ?? 0) * (x.reps ?? 0), 0), 0) ?? 0;

  const uniqueExercises = new Set(
    sessions?.flatMap(s => s.sets.filter(x => x.done).map(x => x.exercise_nome)) ?? []
  ).size;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header com imagem */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black p-6 sm:p-8 min-h-[160px]">
        <img
          src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="relative flex items-center gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Perfil</h1>
            <p className="text-sm text-zinc-400">Dados pessoais e evolucao do aluno.</p>
          </div>
        </div>
      </div>

      {/* Resumo do Progresso com imagens */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80", label: "Treinos", value: totalSessions },
          { img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&q=80", label: "Series feitas", value: totalDone },
          { img: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=200&q=80", label: "Exercicios", value: uniqueExercises },
          { img: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&q=80", label: "Kg total", value: `${totalKg}kg` },
        ].map((stat, i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111112] p-4 text-center">
            <img
              src={stat.img}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#111112] via-[#111112]/90 to-[#111112]" />
            <div className="relative">
              <div className="text-xl font-black text-white">{stat.value}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate({ data: form }); }} className="space-y-5">
        {/* Dados Pessoais com imagem */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111112] p-5 sm:p-6 space-y-4">
          <img
            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/95 to-[#111112]/80" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Dados Pessoais</h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Nome completo</label>
              <input
                value={form.nome}
                onChange={e => update("nome", e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Altura (cm)</label>
                <input
                  value={form.altura}
                  onChange={e => update("altura", e.target.value)}
                  placeholder="Ex: 175"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Peso (kg)</label>
                <input
                  value={form.peso}
                  onChange={e => update("peso", e.target.value)}
                  placeholder="Ex: 80"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-1.5 mt-4">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Objetivo</label>
              <input
                value={form.objetivo}
                onChange={e => update("objetivo", e.target.value)}
                placeholder="Ex: Ganhar massa muscular, Perder peso, Condicionamento"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-1.5 mt-4">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Dias da Semana</label>
              <input
                value={form.dias_semana}
                onChange={e => update("dias_semana", e.target.value)}
                placeholder="Ex: Segunda, Quarta, Sexta"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-1.5 mt-4">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Nome do Personal</label>
              <input
                value={form.personal_nome}
                onChange={e => update("personal_nome", e.target.value)}
                placeholder="Nome do personal trainer"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-1.5 mt-4">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Observacoes</label>
              <textarea
                value={form.observacao}
                onChange={e => update("observacao", e.target.value)}
                placeholder="Restricoes, preferencias, observacoes..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20 placeholder:text-zinc-600 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Botao salvar */}
        <button
          type="submit"
          disabled={save.isPending}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black px-5 py-3 font-bold text-sm hover:brightness-110 disabled:opacity-60 transition-all"
        >
          {save.isPending ? (
            <span className="animate-spin w-4 h-4 border-2 border-black/30 border-t-black rounded-full" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar alteracoes
        </button>
      </form>

      {/* Evolucao do Aluno com imagem */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111112] p-5 sm:p-6 space-y-4">
        <img
          src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/95 to-[#111112]/80" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Evolucao do Aluno</h2>
          </div>

          {!sessions?.length ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Nenhum treino executado ainda. A evolucao aparecera aqui apos completar treinos.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const doneSets = session.sets.filter(x => x.done).length;
                const totalSessionSets = session.sets.length;
                const sessionKg = session.sets.reduce((a, x) => a + (x.kg ?? 0) * (x.reps ?? 0), 0);
                const isExpanded = expandedSession === session.id;
                const date = new Date(session.started_at);
                const dateStr = date.toLocaleDateString("pt-BR");
                const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                const duration = session.ended_at
                  ? Math.round((new Date(session.ended_at).getTime() - date.getTime()) / 60000)
                  : null;

                return (
                  <div
                    key={session.id}
                    className="rounded-xl border border-white/10 bg-black/30 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                        <img
                          src={`https://images.unsplash.com/photo-15${session.workout_letra === 'A' ? '3443838327276' : session.workout_letra === 'B' ? '534438327276' : '71019614242'}?w=80&q=80`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          Treino {session.workout_letra ?? "?"}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {dateStr} as {timeStr}
                          {duration ? ` · ${duration}min` : ""}
                          {" · "}{doneSets}/{totalSessionSets} series
                          {sessionKg > 0 ? ` · ${sessionKg}kg` : ""}
                        </div>
                      </div>
                      {session.ended_at ? (
                        <CheckCircle2 className="w-5 h-5 text-[var(--lime)] shrink-0" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/5 divide-y divide-white/5">
                        {session.sets.map((set, i) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${set.done ? "bg-[var(--lime)]/20 text-[var(--lime)]" : "bg-white/5 text-zinc-600"}`}>
                              {set.done ? "✓" : "–"}
                            </div>
                            <div className="flex-1 text-zinc-300 truncate">{set.exercise_nome}</div>
                            <div className="text-zinc-500 shrink-0">
                              {set.set_index + 1}ª serie
                            </div>
                            <div className="text-zinc-400 shrink-0 tabular-nums">
                              {set.reps ?? "–"} reps
                            </div>
                            <div className="text-zinc-400 shrink-0 tabular-nums">
                              {set.kg ?? "–"} kg
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sair da conta */}
      <button
        onClick={logout}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 text-red-400 px-5 py-3 font-bold text-sm hover:bg-red-500/10 transition-all"
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </button>
    </div>
  );
}
