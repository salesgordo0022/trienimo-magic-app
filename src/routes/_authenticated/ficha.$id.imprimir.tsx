import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getFicha } from "@/lib/workouts.functions";
import { FichaDocument } from "@/components/ficha-document";
import { ArrowLeft, Printer } from "lucide-react";

const fichaQO = (id: string) =>
  queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/ficha/$id/imprimir")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(fichaQO(params.id)),
  component: ImprimirFicha,
});

function ImprimirFicha() {
  const { id } = Route.useParams();
  const { data: ficha } = useSuspenseQuery(fichaQO(id));

  return (
    <div className="min-h-screen bg-[#e7e7e7] text-black print:bg-white print:p-0">
      {/* Toolbar (hidden ao imprimir) */}
      <div className="print:hidden sticky top-0 z-40 bg-black text-white shadow">
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center gap-2">
          <Link to="/ficha/$id" params={{ id }} className="text-white p-1 hover:bg-white/10 rounded">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="font-display font-black uppercase text-sm">PDF — Treino {ficha.workout.letra}</div>
          <div className="ml-auto">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-[var(--yellow)] text-black px-3 py-1.5 text-xs font-black uppercase rounded hover:brightness-110"
            >
              <Printer className="w-3 h-3" />
              Salvar / Imprimir PDF
            </button>
          </div>
        </div>
      </div>

      {/* Documento */}
      <div className="max-w-4xl mx-auto p-3 sm:p-6 print:p-0 print:m-0">
        <div className="bg-white border border-black/10 print:border-0 shadow-sm print:shadow-none">
          <FichaDocument data={ficha} />
        </div>

        <div className="print:hidden mt-4 flex justify-center">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-black text-[var(--yellow)] px-6 py-3 text-sm font-black uppercase rounded hover:opacity-90"
          >
            <Printer className="w-4 h-4" />
            Salvar como PDF
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
