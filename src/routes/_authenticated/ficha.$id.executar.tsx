import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota antiga mantida só por compatibilidade com links já existentes.
// A execução do treino agora vive na aba "Executar" dentro de /ficha/$id.
export const Route = createFileRoute("/_authenticated/ficha/$id/executar")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/ficha/$id", params: { id: params.id }, search: { tab: "executar" } });
  },
});
