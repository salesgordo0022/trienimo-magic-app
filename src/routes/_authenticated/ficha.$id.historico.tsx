import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getHistorico, getFicha } from "@/lib/workouts.functions";
import { ArrowLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

const historicoQO = (id: string) => queryOptions({ queryKey: ["historico", id], queryFn: () => getHistorico({ data: { workout_id: id } }) });
const fichaQO = (id: string) => queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/ficha/$id/historico")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(historicoQO(params.id));
    context.queryClient.ensureQueryData(fichaQO(params.id));
  },
  component: Historico,
});

function Historico() {
  const { id } = Route.useParams();
  const { data: sessions } = useSuspenseQuery(historicoQO(id));
  const { data: ficha } = useSuspenseQuery(fichaQO(id));

  const allExercises = ficha.groups.flatMap(g => g.exercises);

  const progressByExercise = useMemo(() => {
    const map = new Map<string, Array<{ date: string; kg: number }>>();
    for (const s of [...sessions].reverse()) {
      const sd = new Date(s.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const byEx = new Map<string, number>();
      for (const set of s.sets) {
        if (!set.done || set.kg == null) continue;
        byEx.set(set.exercise_id, Math.max(byEx.get(set.exercise_id) ?? 0, set.kg));
      }
      for (const [exId, kg] of byEx) {
        if (!map.has(exId)) map.set(exId, []);
        map.get(exId)!.push({ date: sd, kg });
      }
    }
    return map;
  }, [sessions]);

  return (
    <div className="min-h-screen bg-[var(--row-alt)] pb-24">
      <header className="bg-black text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center gap-2">
          <Link to="/ficha/$id" params={{ id }} className="text-white p-1"><ArrowLeft className="w-4 h-4"/></Link>
          <div className="text-[var(--yellow)] font-display font-black uppercase text-sm">Histórico — Treino {ficha.workout.letra}</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 space-y-4">
        {sessions.length === 0 && (
          <div className="bg-white border border-black/10 p-8 text-center text-sm text-gray-500">
            Nenhuma sessão registrada ainda. Execute um treino para começar.
          </div>
        )}

        {sessions.length > 0 && (
          <div className="bg-white border border-black/10">
            <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm">Progressão de carga</div>
            <div className="p-3 grid gap-4 md:grid-cols-2">
              {allExercises.map(ex => {
                const points = progressByExercise.get(ex.id) ?? [];
                if (points.length === 0) return null;
                return (
                  <div key={ex.id} className="border p-2">
                    <div className="text-xs font-bold uppercase mb-1">{ex.nome}</div>
                    <div style={{ width: "100%", height: 120 }}>
                      <ResponsiveContainer>
                        <LineChart data={points}>
                          <XAxis dataKey="date" fontSize={10}/>
                          <YAxis fontSize={10} width={30}/>
                          <Tooltip/>
                          <Line type="monotone" dataKey="kg" stroke="#0A0A0A" strokeWidth={2} dot={{ fill: "#FFD400" }}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white border border-black/10">
          <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm">Sessões</div>
          <div className="divide-y">
            {sessions.map(s => (
              <div key={s.id} className="p-3">
                <div className="flex justify-between text-sm">
                  <div className="font-bold">{new Date(s.started_at).toLocaleString("pt-BR")}</div>
                  <div className="text-xs text-gray-500">{s.sets.filter(x=>x.done).length} séries</div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  {s.sets.filter(x=>x.done).map((x,i) => (
                    <span key={i} className="bg-gray-100 px-1.5 py-0.5">{x.exercise_nome}: {x.reps ?? "?"}×{x.kg ?? "?"}kg</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
