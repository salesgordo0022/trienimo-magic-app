import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { Placeholder } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: () => <Placeholder title="Configurações" icon={Settings} subtitle="Notificações, tema e preferências do app."/>,
});
