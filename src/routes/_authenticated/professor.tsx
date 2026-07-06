import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listMyStudents, getMyRole } from "@/lib/roles.functions";
import { listWorkoutsForStudent, createWorkout, deleteWorkout } from "@/lib/workouts.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Play } from "lucide-react";

const studentsQO = () => queryOptions({ queryKey: ["myStudents"], queryFn: () => listMyStudents() });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });

export const Route = createFileRoute("/_authenticated/professor")({
  loader: async ({ context }) => {
    const r = await context.queryClient.ensureQueryData(roleQO());
    if (r.role !== "admin" && r.role !== "professor") throw redirect({ to: "/app" });
    context.queryClient.ensureQueryData(studentsQO());
  },
  component: ProfessorPage,
});

function ProfessorPage() {
  const { data: students } = useSuspenseQuery(studentsQO());
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(students[0]?.id ?? null);

  // Presence: anuncia como online
  useEffect(() => {
    const channel = supabase.channel("presence:professores", { config: { presence: { key: "user" } } });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const { data } = await supabase.auth.getUser();
        if (data.user) await channel.track({ user_id: data.user.id });
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--row-alt)]">
      <header className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate({ to: "/app" })} className="text-white/70 hover:text-white"><ArrowLeft className="w-4 h-4"/></button>
          <div className="text-[var(--yellow)] font-display text-xl font-black">MEUS ALUNOS</div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 grid gap-4 md:grid-cols-[240px_1fr]">
        <aside className="bg-white border border-black/10">
          <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm">Alunos</div>
          {students.length === 0 && <div className="p-3 text-xs text-gray-500">Nenhum aluno atribuído. Peça ao admin para atribuir.</div>}
          {students.map(s => (
            <button key={s.id} onClick={()=>setSelected(s.id)} className={`w-full text-left px-3 py-2 text-sm border-t ${selected===s.id?"bg-black text-[var(--yellow)]":"hover:bg-gray-50"}`}>
              {s.nome ?? "(sem nome)"}
            </button>
          ))}
        </aside>
        <section>
          {selected ? <StudentWorkouts studentId={selected} studentName={students.find(s=>s.id===selected)?.nome ?? ""}/> : <div className="bg-white border p-8 text-center text-sm text-gray-500">Selecione um aluno.</div>}
        </section>
      </main>
      <div className="max-w-5xl mx-auto px-4 pb-6 text-xs text-gray-500">
        <Link to="/app" className="underline">Voltar ao app</Link>
      </div>
    </div>
  );
}

function StudentWorkouts({ studentId, studentName }: { studentId: string; studentName: string }) {
  const qc = useQueryClient();
  const { data: workouts = [] } = useQuery({ queryKey: ["studentWorkouts", studentId], queryFn: () => listWorkoutsForStudent({ data: { student_id: studentId } }) });
  const [letra, setLetra] = useState("");

  const create = useMutation({
    mutationFn: useServerFn(createWorkout),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["studentWorkouts", studentId] }); setLetra(""); toast.success("Ficha criada"); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteWorkout),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["studentWorkouts", studentId] }),
  });

  return (
    <div className="bg-white border border-black/10">
      <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm">Fichas de {studentName}</div>
      <form onSubmit={(e)=>{e.preventDefault(); if(!letra) return; create.mutate({ data: { letra, assigned_to: studentId } });}} className="p-3 flex gap-2 border-b">
        <Input placeholder="Letra (A, B, C...)" value={letra} onChange={e=>setLetra(e.target.value.slice(0,3))} className="uppercase w-40"/>
        <Button type="submit" disabled={create.isPending} className="bg-black text-white font-bold uppercase"><Plus className="w-4 h-4 mr-1"/>Nova ficha</Button>
      </form>
      {workouts.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500">Nenhuma ficha prescrita.</div>
      ) : (
        <ul className="divide-y">
          {workouts.map(w => (
            <li key={w.id} className="flex items-center gap-3 p-3">
              <div className="bg-black text-[var(--yellow)] w-14 h-14 flex items-center justify-center font-display font-black text-3xl">{w.letra}</div>
              <div className="flex-1">
                <div className="font-bold uppercase text-sm">Treino {w.letra}</div>
                {w.nome && <div className="text-xs text-gray-500">{w.nome}</div>}
              </div>
              <Link to="/ficha/$id" params={{ id: w.id }} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 text-xs font-bold uppercase"><Pencil className="w-3 h-3"/>Editar</Link>
              <Link to="/ficha/$id/executar" params={{ id: w.id }} className="inline-flex items-center gap-1 bg-[var(--yellow)] text-black px-2 py-1 text-xs font-bold uppercase"><Play className="w-3 h-3"/>Ver</Link>
              <button onClick={()=>{ if(confirm("Excluir?")) del.mutate({ data: { id: w.id } });}} className="text-red-600 p-1"><Trash2 className="w-3 h-3"/></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
