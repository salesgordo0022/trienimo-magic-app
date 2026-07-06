import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getFicha, updateWorkout, addGroup, deleteGroup,
  addExercise, updateExercise, deleteExercise,
  type ExerciseRow,
} from "@/lib/workouts.functions";
import { getMyRole, listMyStudents } from "@/lib/roles.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2, Play, History, ArrowLeft, User, FileText, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const fichaQO = (id: string) => queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });
const studentsQO = () => queryOptions({ queryKey: ["myStudents"], queryFn: () => listMyStudents() });

export const Route = createFileRoute("/_authenticated/ficha/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(fichaQO(params.id)),
  component: FichaEditor,
});

const pageBg = "radial-gradient(1200px 600px at 15% 10%, rgba(255,212,0,0.08), transparent 60%), radial-gradient(900px 500px at 90% 90%, rgba(255,212,0,0.05), transparent 60%), #0b0b0d";
const glassCard = "rounded-2xl border border-white/10 backdrop-blur-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]";
const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-zinc-600 focus:border-[var(--yellow)]/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-[var(--yellow)]/10";
const goldBtn = "inline-flex items-center justify-center gap-2 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60";
const goldBtnStyle = { background: "linear-gradient(135deg, #FFD400, #FFB800)", boxShadow: "0 10px 30px -12px rgba(255,212,0,0.55)" } as const;
const chipBtn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all";

function FichaEditor() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(fichaQO(id));
  const qc = useQueryClient();
  const navigate = useNavigate();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ficha", id] });

  const updW = useMutation({ mutationFn: useServerFn(updateWorkout), onSuccess: invalidate });
  const addG = useMutation({ mutationFn: useServerFn(addGroup), onSuccess: invalidate });
  const delG = useMutation({ mutationFn: useServerFn(deleteGroup), onSuccess: invalidate });
  const addE = useMutation({ mutationFn: useServerFn(addExercise), onSuccess: invalidate });
  const delE = useMutation({ mutationFn: useServerFn(deleteExercise), onSuccess: invalidate });

  const [newGroupName, setNewGroupName] = useState("");

  return (
    <div className="min-h-screen text-white pb-24" style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif", background: pageBg }}>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/app" className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"><ArrowLeft className="w-4 h-4"/></Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold text-sm" style={{ background: "linear-gradient(135deg, #FFD400, #FFB800)" }}>{data.workout.letra}</div>
            <div className="text-sm font-semibold text-white tracking-tight">Treino {data.workout.letra}</div>
          </div>
          <div className="ml-auto flex gap-1.5">
            <Link to="/ficha/$id/executar" params={{ id }} className={chipBtn} style={goldBtnStyle}><Play className="w-3 h-3"/>Executar</Link>
            <Link to="/ficha/$id/historico" params={{ id }} className={`${chipBtn} bg-white/5 hover:bg-white/10 border border-white/10 text-white`}><History className="w-3 h-3"/>Histórico</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Cabeçalho estilo ficha */}
        <div className={`${glassCard} overflow-hidden`}>
          <div className="grid grid-cols-[1fr_auto] gap-3 p-5 items-stretch">
            <div className="flex items-center gap-4">
              <div className="text-3xl md:text-4xl font-bold tracking-tight">
                <span className="text-white">{(data.profile.logo_texto ?? "Sua").replace(/logo/i, "")}</span>
                <span className="text-[var(--yellow)]">{/logo/i.test(data.profile.logo_texto ?? "SuaLogo") ? "Logo" : "Logo"}</span>
              </div>
              <div className="hidden md:block border-l border-white/10 pl-4">
                <div className="font-semibold text-sm text-white">{data.profile.personal_nome ?? "SEU NOME - PERSONAL TRAINER"}</div>
                <div className="text-xs text-zinc-500 mt-0.5">FICHA DE TREINO</div>
              </div>
            </div>
            <div className="rounded-xl px-5 py-3 text-center min-w-[90px] text-black" style={{ background: "linear-gradient(135deg, #FFD400, #FFB800)" }}>
              <div className="text-[10px] font-bold uppercase opacity-70">Treino</div>
              <div className="font-bold text-4xl leading-none">{data.workout.letra}</div>
            </div>
          </div>
          <div className="border-t border-white/5 divide-y divide-white/5 text-sm">
            <HeaderField label="Aluno" value={data.profile.nome ?? ""} readOnly/>
            <HeaderField label="Data do Início" value={data.workout.data_inicio ?? ""} onSave={v=>updW.mutate({data:{id, data_inicio: v}})} type="date"/>
            <HeaderField label="Objetivo" value={data.profile.objetivo ?? ""} readOnly/>
            <HeaderField label="Dias da Semana" value={data.profile.dias_semana ?? ""} readOnly/>
            <HeaderField label="Observação" value={data.workout.observacao ?? ""} onSave={v=>updW.mutate({data:{id, observacao: v}})}/>
          </div>
        </div>

        {/* Grupos */}
        {data.groups.map(g => (
          <GroupBlock key={g.id} group={g} onDelete={() => delG.mutate({data:{id:g.id}})}
            onAddExercise={(nome) => addE.mutate({data:{group_id:g.id, nome}})}
            onDeleteExercise={(eid) => delE.mutate({data:{id:eid}})}
            onExerciseSaved={invalidate}/>
        ))}

        <form className={`${glassCard} p-4 flex gap-2`} onSubmit={(e)=>{e.preventDefault(); if(!newGroupName) return; addG.mutate({data:{workout_id:id, nome:newGroupName}}); setNewGroupName("");}}>
          <input placeholder="Novo grupo (ex: COSTAS, PERNAS...)" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} className={inputCls}/>
          <button type="submit" className={goldBtn} style={goldBtnStyle}><Plus className="w-4 h-4"/>Grupo</button>
        </form>
      </main>
    </div>
  );
}

function HeaderField({ label, value, onSave, readOnly, type }: { label: string; value: string; onSave?: (v: string) => void; readOnly?: boolean; type?: string }) {
  const [v, setV] = useState(value);
  return (
    <div className="grid grid-cols-[140px_1fr] items-center">
      <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 bg-white/[0.02]">{label}</div>
      {readOnly ? (
        <div className="px-4 py-2.5 text-sm text-white">{value || <span className="text-zinc-600 text-xs">defina em Perfil</span>}</div>
      ) : (
        <input
          type={type ?? "text"}
          value={v}
          onChange={e=>setV(e.target.value)}
          onBlur={()=> v !== value && onSave?.(v)}
          className="px-4 py-2.5 text-sm bg-transparent text-white outline-none focus:bg-[var(--yellow)]/5"
        />
      )}
    </div>
  );
}

function GroupBlock({ group, onDelete, onAddExercise, onDeleteExercise, onExerciseSaved }: {
  group: { id: string; nome: string; exercises: ExerciseRow[] };
  onDelete: () => void;
  onAddExercise: (nome: string) => void;
  onDeleteExercise: (id: string) => void;
  onExerciseSaved: () => void;
}) {
  const [newEx, setNewEx] = useState("");
  return (
    <div className={`${glassCard} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 bg-black/30">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #FFD400, #FFB800)" }} />
        <div className="font-semibold uppercase tracking-wide text-sm text-white flex-1">{group.nome}</div>
        <button onClick={()=>{if(confirm("Excluir grupo e exercícios?")) onDelete();}} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-black" style={{ background: "linear-gradient(135deg, #FFD400, #FFB800)" }}>
              <th className="px-2 py-2 w-12 text-left font-bold">Nº</th>
              <th className="px-2 py-2 text-left font-bold">Exercício</th>
              {[0,1,2,3].map(i => (<><th key={"r"+i} className="px-2 py-2 w-16 text-left font-bold">Repets</th><th key={"k"+i} className="px-2 py-2 w-16 text-left font-bold">Kg</th></>))}
              <th className="px-2 py-2 w-16 text-left font-bold">Desc</th>
              <th className="px-2 py-2 w-24 text-left font-bold">Obs</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {group.exercises.map((ex, i) => (
              <ExerciseRowEditor key={ex.id} ex={ex} rowIndex={i} onSaved={onExerciseSaved} onDelete={() => onDeleteExercise(ex.id)}/>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-white/5">
        {group.exercises.map(ex => (
          <ExerciseCardMobile key={ex.id} ex={ex} onSaved={onExerciseSaved} onDelete={() => onDeleteExercise(ex.id)}/>
        ))}
      </div>

      <form className="p-3 flex gap-2 border-t border-white/5" onSubmit={(e)=>{e.preventDefault(); if(!newEx)return; onAddExercise(newEx); setNewEx("");}}>
        <input placeholder="Novo exercício" value={newEx} onChange={e=>setNewEx(e.target.value)} className={`${inputCls} py-2`}/>
        <button type="submit" className={`${chipBtn} text-black`} style={goldBtnStyle}><Plus className="w-3 h-3"/>Add</button>
      </form>
    </div>
  );
}

function useExerciseState(ex: ExerciseRow) {
  const [series, setSeries] = useState(String(ex.series));
  const [desc, setDesc] = useState(String(ex.desc_segundos));
  const [obs, setObs] = useState(ex.obs ?? "");
  const [nome, setNome] = useState(ex.nome);
  const sc = ex.sets_config ?? [];
  const [sets, setSets] = useState<Array<{reps:string;kg:string}>>(
    Array.from({length: 4}, (_, i) => ({ reps: sc[i]?.reps ?? "", kg: sc[i]?.kg ?? "" }))
  );
  return { series, setSeries, desc, setDesc, obs, setObs, nome, setNome, sets, setSets };
}

function ExerciseRowEditor({ ex, rowIndex, onSaved, onDelete }: { ex: ExerciseRow; rowIndex: number; onSaved: () => void; onDelete: () => void }) {
  const upd = useMutation({ mutationFn: useServerFn(updateExercise), onSuccess: onSaved, onError: (e)=>toast.error(e.message) });
  const s = useExerciseState(ex);
  const save = () => upd.mutate({ data: {
    id: ex.id, nome: s.nome, series: parseInt(s.series)||1, desc_segundos: parseInt(s.desc)||0,
    obs: s.obs || null, sets_config: s.sets,
  }});
  const bg = rowIndex % 2 === 0 ? "bg-white/[0.015]" : "bg-white/[0.04]";
  const td = "px-2 py-2 border-b border-white/5 text-white";
  const inp = "bg-transparent outline-none focus:bg-[var(--yellow)]/5 rounded px-1 py-0.5";
  return (
    <tr className={bg}>
      <td className={`${td} w-12`}><input value={s.series} onChange={e=>s.setSeries(e.target.value)} onBlur={save} className={`${inp} w-8`}/><span className="text-zinc-500">x</span></td>
      <td className={td}><input value={s.nome} onChange={e=>s.setNome(e.target.value)} onBlur={save} className={`${inp} w-full`}/></td>
      {s.sets.map((set, i) => (
        <>
          <td key={"r"+i} className={td}><input value={set.reps} onChange={e=>{const c=[...s.sets];c[i]={...c[i],reps:e.target.value};s.setSets(c);}} onBlur={save} placeholder="10" className={`${inp} w-14 placeholder:text-zinc-700`}/></td>
          <td key={"k"+i} className={td}><input value={set.kg} onChange={e=>{const c=[...s.sets];c[i]={...c[i],kg:e.target.value};s.setSets(c);}} onBlur={save} placeholder="kg" className={`${inp} w-14 placeholder:text-zinc-700`}/></td>
        </>
      ))}
      <td className={td}><input value={s.desc} onChange={e=>s.setDesc(e.target.value)} onBlur={save} className={`${inp} w-12`}/><span className="text-zinc-500">s</span></td>
      <td className={td}><input value={s.obs} onChange={e=>s.setObs(e.target.value)} onBlur={save} className={`${inp} w-full placeholder:text-zinc-700`} placeholder="—"/></td>
      <td className={td}><button onClick={onDelete} className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3 h-3"/></button></td>
    </tr>
  );
}

function ExerciseCardMobile({ ex, onSaved, onDelete }: { ex: ExerciseRow; onSaved: () => void; onDelete: () => void }) {
  const upd = useMutation({ mutationFn: useServerFn(updateExercise), onSuccess: onSaved });
  const s = useExerciseState(ex);
  const save = () => upd.mutate({ data: {
    id: ex.id, nome: s.nome, series: parseInt(s.series)||1, desc_segundos: parseInt(s.desc)||0,
    obs: s.obs || null, sets_config: s.sets,
  }});
  return (
    <div className="p-3 space-y-2">
      <div className="flex gap-2">
        <input value={s.nome} onChange={e=>s.setNome(e.target.value)} onBlur={save} className="flex-1 font-semibold text-sm bg-transparent border-b border-white/10 focus:border-[var(--yellow)]/60 outline-none text-white pb-1"/>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4"/></button>
      </div>
      <div className="flex gap-3 text-xs text-zinc-400">
        <label className="flex items-center gap-1.5">Séries <input value={s.series} onChange={e=>s.setSeries(e.target.value)} onBlur={save} className="w-10 border-b border-white/10 bg-transparent text-white text-center outline-none focus:border-[var(--yellow)]/60"/></label>
        <label className="flex items-center gap-1.5">Desc <input value={s.desc} onChange={e=>s.setDesc(e.target.value)} onBlur={save} className="w-10 border-b border-white/10 bg-transparent text-white text-center outline-none focus:border-[var(--yellow)]/60"/>s</label>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {s.sets.map((set,i)=>(
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs">
            <div className="text-[10px] text-zinc-500 mb-1">Série {i+1}</div>
            <input value={set.reps} onChange={e=>{const c=[...s.sets];c[i]={...c[i],reps:e.target.value};s.setSets(c);}} onBlur={save} placeholder="reps" className="w-full bg-transparent text-white outline-none placeholder:text-zinc-700"/>
            <input value={set.kg} onChange={e=>{const c=[...s.sets];c[i]={...c[i],kg:e.target.value};s.setSets(c);}} onBlur={save} placeholder="kg" className="w-full bg-transparent text-white outline-none placeholder:text-zinc-700"/>
          </div>
        ))}
      </div>
      <input value={s.obs} onChange={e=>s.setObs(e.target.value)} onBlur={save} placeholder="Observação" className="w-full text-xs border-b border-white/10 bg-transparent text-white outline-none focus:border-[var(--yellow)]/60 pb-1 placeholder:text-zinc-600"/>
    </div>
  );
}
