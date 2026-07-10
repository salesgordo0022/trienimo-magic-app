import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { Placeholder } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/mensagens")({
  component: () => <Placeholder title="Mensagens" icon={MessageSquare} subtitle="Converse com seu professor e receba orientações."/>,
});
