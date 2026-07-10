import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { Placeholder } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/progresso")({
  component: () => <Placeholder title="Progresso" icon={TrendingUp} subtitle="Acompanhe sua evolução, cargas e frequência ao longo do tempo."/>,
});
