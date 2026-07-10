import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { Placeholder } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: () => <Placeholder title="Agenda" icon={Calendar} subtitle="Organize seus horários de treino e compromissos."/>,
});
