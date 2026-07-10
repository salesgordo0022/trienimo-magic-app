import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Calendar, MessageSquare, User, Settings } from "lucide-react";
import type { ComponentType } from "react";

function Placeholder({ title, icon: Icon, subtitle }: { title: string; icon: ComponentType<{ className?: string }>; subtitle: string }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="rounded-3xl border border-white/10 bg-[#111112] p-10 sm:p-14 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center mb-4">
          <Icon className="w-8 h-8"/>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">{title}</h1>
        <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">{subtitle}</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--lime)]/10 text-[var(--lime)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
          Em breve
        </div>
      </div>
    </div>
  );
}

export const ProgressoRoute = createFileRoute("/_authenticated/progresso")({
  component: () => <Placeholder title="Progresso" icon={TrendingUp} subtitle="Acompanhe sua evolução, cargas e frequência ao longo do tempo."/>,
});

export const AgendaRoute = createFileRoute("/_authenticated/agenda")({
  component: () => <Placeholder title="Agenda" icon={Calendar} subtitle="Organize seus horários de treino e compromissos."/>,
});

export const MensagensRoute = createFileRoute("/_authenticated/mensagens")({
  component: () => <Placeholder title="Mensagens" icon={MessageSquare} subtitle="Converse com seu professor e receba orientações."/>,
});

export const PerfilRoute = createFileRoute("/_authenticated/perfil")({
  component: () => <Placeholder title="Perfil" icon={User} subtitle="Suas informações, objetivos e preferências."/>,
});

export const ConfiguracoesRoute = createFileRoute("/_authenticated/configuracoes")({
  component: () => <Placeholder title="Configurações" icon={Settings} subtitle="Notificações, tema e preferências do app."/>,
});
