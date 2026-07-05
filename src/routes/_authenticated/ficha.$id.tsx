import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getFicha, updateWorkout, addGroup, deleteGroup,
  addExercise, updateExercise, deleteExercise,
  type ExerciseRow,
} from "@/lib/workouts.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Play, History, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const fichaQO = (id: string) => queryOptions({ queryKey: ["ficha", id], queryFn: () => getFicha({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/ficha/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(fichaQO(params.id)),
  component: FichaEditor,
});

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
    <div className="min-h-screen bg-[var(--row-alt)] pb-24">
      <header className="bg-black text-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-2">
          <Link to="/app" className="text-white p-1"><ArrowLeft className="w-4 h-4"/></Link>
          <div className="text-[var(--yellow)] font-display font-black uppercase text-sm">Treino {data.workout.letra}</div>
          <div className="ml-auto flex gap-2">
            <Link to="/ficha/$id/executar" params={{ id }} className="inline-flex items-center gap-1 bg-[var(--yellow)] text-black px-2 py-1 text-xs font-bold uppercase"><Play className="w-3 h-3"/>Executar</Link>
            <Link to="/ficha/$id/historico" params={{ id }} className="inline-flex items-center gap-1 bg-white/10 px-2 py-1 text-xs font-bold uppercase"><History className="w-3 h-3"/>Histórico</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-3 space-y-4">
        {/* Cabeçalho estilo ficha */}
        <div className="bg-white border border-black/10">
          <div className="grid grid-cols-[1fr_auto] gap-2 p-3 items-stretch">
            <div className="flex items-center gap-3">
              <div className="font-display text-3xl md:text-4xl font-black">
                <span className="text-black">{(data.profile.logo_texto ?? "Sua").replace(/logo/i, "")}</span>
                <span className="text-[var(--yellow)]">{/logo/i.test(data.profile.logo_texto ?? "SuaLogo") ? "Logo" : "Logo"}</span>
              </div>
              <div className="hidden md:block border-l pl-3">
                <div className="font-bold text-sm">{data.profile.personal_nome ?? "SEU NOME - PERSONAL TRAINER"}</div>
                <div className="text-xs text-gray-500">FICHA DE TREINO</div>
              </div>
            </div>
            <div className="bg-black text-[var(--yellow)] px-4 py-2 text-center min-w-[80px]">
              <div className="text-[10px] font-bold text-white uppercase">Treino:</div>
              <div className="font-display font-black text-4xl leading-none">{data.workout.letra}</div>
            </div>
          </div>
          <div className="border-t divide-y text-sm">
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

        <form className="bg-white border border-black/10 p-3 flex gap-2" onSubmit={(e)=>{e.preventDefault(); if(!newGroupName) return; addG.mutate({data:{workout_id:id, nome:newGroupName}}); setNewGroupName("");}}>
          <Input placeholder="Novo grupo (ex: COSTAS, PERNAS...)" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)}/>
          <Button type="submit" className="bg-black text-white"><Plus className="w-4 h-4 mr-1"/>Grupo</Button>
        </form>
      </main>
    </div>
  );
}

function HeaderField({ label, value, onSave, readOnly, type }: { label: string; value: string; onSave?: (v: string) => void; readOnly?: boolean; type?: string }) {
  const [v, setV] = useState(value);
  return (
    <div className="grid grid-cols-[130px_1fr] items-center">
      <div className="bg-[var(--row-alt)] px-2 py-1.5 text-xs font-bold uppercase">{label}</div>
      {readOnly ? (
        <div className="px-2 py-1.5 text-sm">{value || <span className="text-gray-400 text-xs">defina em Perfil</span>}</div>
      ) : (
        <input
          type={type ?? "text"}
          value={v}
          onChange={e=>setV(e.target.value)}
          onBlur={()=> v !== value && onSave?.(v)}
          className="px-2 py-1.5 text-sm bg-white outline-none focus:bg-yellow-50"
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
    <div className="bg-white border border-black/10">
      <div className="bg-black text-[var(--yellow)] px-3 py-1.5 flex items-center gap-2">
        <div className="font-display font-black uppercase text-sm flex-1">{group.nome}</div>
        <button onClick={()=>{if(confirm("Excluir grupo e exercícios?")) onDelete();}} className="text-white/60 hover:text-white"><Trash2 className="w-3 h-3"/></button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="ficha-th w-12">Nº</th>
              <th className="ficha-th">Exercício</th>
              {[0,1,2,3].map(i => (<><th key={"r"+i} className="ficha-th w-16">Repets</th><th key={"k"+i} className="ficha-th w-16">Kg</th></>))}
              <th className="ficha-th w-16">Desc</th>
              <th className="ficha-th w-24">Obs</th>
              <th className="ficha-th w-8"></th>
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
      <div className="md:hidden divide-y">
        {group.exercises.map(ex => (
          <ExerciseCardMobile key={ex.id} ex={ex} onSaved={onExerciseSaved} onDelete={() => onDeleteExercise(ex.id)}/>
        ))}
      </div>

      <form className="p-2 flex gap-2 border-t" onSubmit={(e)=>{e.preventDefault(); if(!newEx)return; onAddExercise(newEx); setNewEx("");}}>
        <Input placeholder="Novo exercício" value={newEx} onChange={e=>setNewEx(e.target.value)} className="h-8"/>
        <Button size="sm" type="submit" className="bg-black text-white"><Plus className="w-3 h-3 mr-1"/>Add</Button>
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
  const bg = rowIndex % 2 === 0 ? "bg-white" : "bg-[var(--row-alt)]";
  return (
    <tr className={bg}>
      <td className="ficha-td w-12"><input value={s.series} onChange={e=>s.setSeries(e.target.value)} onBlur={save} className="w-8 bg-transparent"/>x</td>
      <td className="ficha-td"><input value={s.nome} onChange={e=>s.setNome(e.target.value)} onBlur={save} className="w-full bg-transparent"/></td>
      {s.sets.map((set, i) => (
        <>
          <td key={"r"+i} className="ficha-td"><input value={set.reps} onChange={e=>{const c=[...s.sets];c[i]={...c[i],reps:e.target.value};s.setSets(c);}} onBlur={save} placeholder="10" className="w-14 bg-transparent"/></td>
          <td key={"k"+i} className="ficha-td"><input value={set.kg} onChange={e=>{const c=[...s.sets];c[i]={...c[i],kg:e.target.value};s.setSets(c);}} onBlur={save} placeholder="kg" className="w-14 bg-transparent"/></td>
        </>
      ))}
      <td className="ficha-td"><input value={s.desc} onChange={e=>s.setDesc(e.target.value)} onBlur={save} className="w-12 bg-transparent"/>s</td>
      <td className="ficha-td"><input value={s.obs} onChange={e=>s.setObs(e.target.value)} onBlur={save} className="w-full bg-transparent" placeholder="—"/></td>
      <td className="ficha-td"><button onClick={onDelete} className="text-red-500"><Trash2 className="w-3 h-3"/></button></td>
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
        <input value={s.nome} onChange={e=>s.setNome(e.target.value)} onBlur={save} className="flex-1 font-bold text-sm bg-transparent border-b border-transparent focus:border-black outline-none"/>
        <button onClick={onDelete} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
      </div>
      <div className="flex gap-2 text-xs">
        <label className="flex items-center gap-1">Séries <input value={s.series} onChange={e=>s.setSeries(e.target.value)} onBlur={save} className="w-10 border-b bg-transparent"/></label>
        <label className="flex items-center gap-1">Desc <input value={s.desc} onChange={e=>s.setDesc(e.target.value)} onBlur={save} className="w-10 border-b bg-transparent"/>s</label>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {s.sets.map((set,i)=>(
          <div key={i} className="border p-1 text-xs">
            <div className="text-[10px] text-gray-500">Série {i+1}</div>
            <input value={set.reps} onChange={e=>{const c=[...s.sets];c[i]={...c[i],reps:e.target.value};s.setSets(c);}} onBlur={save} placeholder="reps" className="w-full bg-transparent"/>
            <input value={set.kg} onChange={e=>{const c=[...s.sets];c[i]={...c[i],kg:e.target.value};s.setSets(c);}} onBlur={save} placeholder="kg" className="w-full bg-transparent"/>
          </div>
        ))}
      </div>
      <input value={s.obs} onChange={e=>s.setObs(e.target.value)} onBlur={save} placeholder="Observação" className="w-full text-xs border-b bg-transparent"/>
    </div>
  );
}
