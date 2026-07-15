import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFicha, startSession, upsertSessionSet, endSession } from "@/lib/workouts.functions";
import { searchExercises } from "@/lib/exercisedb.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Pause, Play, SkipForward, Eye } from "lucide-react";
import { toast } from "sonner";

const fichaQO = (id: string) => queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/ficha/$id/executar")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(fichaQO(params.id)),
  component: Executar,
});

type SetKey = string; // exId::index
type SetValue = { reps: string; kg: string; done: boolean };

function Executar() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(fichaQO(id));
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<Record<SetKey, SetValue>>({});
  const [timer, setTimer] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const start = useMutation({ mutationFn: useServerFn(startSession), onSuccess: (r: { id: string }) => setSessionId(r.id), onError:(e)=>toast.error(e.message) });
  const upsert = useMutation({ mutationFn: useServerFn(upsertSessionSet) });
  const end = useMutation({ mutationFn: useServerFn(endSession), onSuccess: () => navigate({ to: "/ficha/$id/historico", params: { id } }) });

  useEffect(() => { if (!sessionId) start.mutate({ data: { workout_id: id } }); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (!running) return;
    timerRef.current = window.setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          setRunning(false);
          try { audioRef.current?.play(); } catch { /* ignore */ }
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [running]);

  const startRest = (seconds: number) => {
    setTimer(seconds || 45);
    setRunning(true);
  };

  const totalSets = useMemo(() => data.groups.reduce((n,g)=>n+g.exercises.reduce((m,e)=>m+e.series,0),0), [data]);
  const doneSets = Object.values(state).filter(v => v.done).length;

  const toggleSet = (exId: string, setIdx: number, defaultReps: string, defaultKg: string, restSec: number) => {
    const key = `${exId}::${setIdx}`;
    const cur = state[key] ?? { reps: defaultReps, kg: defaultKg, done: false };
    const next: SetValue = { ...cur, done: !cur.done };
    setState(s => ({ ...s, [key]: next }));
    if (sessionId) {
      upsert.mutate({ data: {
        session_id: sessionId, exercise_id: exId, set_index: setIdx,
        reps: next.reps ? parseInt(next.reps) : null, kg: next.kg ? parseFloat(next.kg) : null, done: next.done,
      }});
    }
    if (next.done) startRest(restSec);
  };

  const updateInput = (exId: string, setIdx: number, patch: Partial<SetValue>, defaults: {reps:string;kg:string}) => {
    const key = `${exId}::${setIdx}`;
    const cur = state[key] ?? { reps: defaults.reps, kg: defaults.kg, done: false };
    setState(s => ({ ...s, [key]: { ...cur, ...patch } }));
  };

  return (
    <div className="min-h-screen bg-[var(--row-alt)] pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACAgICAgICAgIA=" preload="auto"/>
      <header className="bg-black text-white sticky top-0 z-40 safe-top safe-x">
        <div className="max-w-3xl mx-auto px-3 py-2 flex items-center gap-2">
          <Link to="/ficha/$id" params={{ id }} className="text-white p-1"><ArrowLeft className="w-4 h-4"/></Link>
          <div className="text-[var(--yellow)] font-display font-black uppercase text-sm truncate">Executando Treino {data.workout.letra}</div>
          <div className="ml-auto text-xs text-white/80 shrink-0">{doneSets}/{totalSets} séries</div>
        </div>
      </header>

      {/* Timer flutuante */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+42px)] z-30 bg-[var(--yellow)] border-b-4 border-black safe-x">
        <div className="max-w-3xl mx-auto px-3 py-2 flex items-center gap-3">
          <div className="font-display font-black text-4xl leading-none text-black tabular-nums">{Math.floor(timer/60)}:{String(timer%60).padStart(2,"0")}</div>
          <div className="text-xs font-bold uppercase">Descanso</div>

          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={()=>setRunning(r=>!r)} className="bg-black text-white">{running ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}</Button>
            <Button size="sm" onClick={()=>{setTimer(0);setRunning(false);}} className="bg-white text-black border border-black"><SkipForward className="w-4 h-4"/></Button>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto p-3 space-y-4">
        {data.groups.map(g => (
          <div key={g.id} className="bg-white border border-black/10">
            <div className="bg-black text-[var(--yellow)] px-3 py-1.5 font-display font-black uppercase text-sm">{g.nome}</div>
            <div className="divide-y">
              {g.exercises.map(ex => (
                <div key={ex.id} className="p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-bold text-sm flex-1">{ex.nome}</div>
                    <ExerciseGif nome={ex.nome}/>
                    <div className="text-xs text-gray-500">Desc: {ex.desc_segundos}s</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {Array.from({length: ex.series}).map((_, i) => {
                      const cfg = ex.sets_config?.[i] ?? { reps: "", kg: "" };
                      const key = `${ex.id}::${i}`;
                      const cur = state[key] ?? { reps: cfg.reps ?? "", kg: cfg.kg ?? "", done: false };
                      return (
                        <div key={i} className={`flex items-center gap-2 border p-2 ${cur.done ? "bg-green-50 border-green-500" : "bg-white"}`}>
                          <div className="w-8 text-xs font-bold text-center">S{i+1}</div>
                          <Input value={cur.reps} onChange={e=>updateInput(ex.id, i, {reps:e.target.value}, {reps:cfg.reps??"",kg:cfg.kg??""})} placeholder="reps" className="h-8 w-16 text-sm"/>
                          <Input value={cur.kg} onChange={e=>updateInput(ex.id, i, {kg:e.target.value}, {reps:cfg.reps??"",kg:cfg.kg??""})} placeholder="kg" className="h-8 w-16 text-sm"/>
                          <Button size="sm" onClick={()=>toggleSet(ex.id, i, cfg.reps??"", cfg.kg??"", ex.desc_segundos)} className={`ml-auto h-8 ${cur.done ? "bg-green-600" : "bg-black"} text-white`}>
                            <Check className="w-4 h-4"/>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <Button onClick={() => sessionId && end.mutate({ data: { id: sessionId } })} className="w-full bg-black text-white font-bold uppercase h-12">
          Finalizar Treino
        </Button>
      </main>
    </div>
  );
}

function ExerciseGif({ nome }: { nome: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["ex", "byName", nome],
    queryFn: () => searchExercises({ data: { q: nome, limit: 1 } }),
    enabled: open,
    staleTime: 1000 * 60 * 60,
  });
  const ex = q.data?.[0];
  return (
    <>
      <button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-black bg-[var(--yellow)] rounded-md px-2 py-1">
        <Eye className="w-3 h-3"/> GIF
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={()=>setOpen(false)}>
          <div onClick={e=>e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-black text-white px-4 py-2 text-sm font-bold uppercase flex justify-between items-center">
              <span className="truncate">{nome}</span>
              <button onClick={()=>setOpen(false)} className="text-white/70">✕</button>
            </div>
            {q.isLoading && <div className="p-10 text-center text-sm text-gray-500">Carregando...</div>}
            {!q.isLoading && !ex && <div className="p-10 text-center text-sm text-gray-500">Nenhuma animação encontrada. Tente renomear em inglês (ex: "bench press").</div>}
            {ex && (
              <>
                <img src={ex.gifUrl} alt={ex.name} className="w-full aspect-square object-contain bg-white"/>
                <div className="p-3 text-xs text-gray-700 space-y-1">
                  <div><b className="uppercase text-[10px] text-gray-500">Alvo:</b> {ex.target}</div>
                  <div><b className="uppercase text-[10px] text-gray-500">Equip:</b> {ex.equipment}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
