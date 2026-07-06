import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { listWorkouts, listAssignedToMe, createWorkout, deleteWorkout, getProfile, updateProfile } from "@/lib/workouts.functions";
import { getMyRole } from "@/lib/roles.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, LogOut, Trash2, Play, Pencil, History, Download, Shield, Users } from "lucide-react";

const workoutsQO = () => queryOptions({ queryKey: ["workouts"], queryFn: () => listWorkouts() });
const assignedQO = () => queryOptions({ queryKey: ["assigned"], queryFn: () => listAssignedToMe() });
const profileQO = () => queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });

export const Route = createFileRoute("/_authenticated/app")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(workoutsQO());
    context.queryClient.ensureQueryData(assignedQO());
    context.queryClient.ensureQueryData(profileQO());
    context.queryClient.ensureQueryData(roleQO());
  },
  component: Dashboard,
});


function Dashboard() {
  const { data: workouts } = useSuspenseQuery(workoutsQO());
  const { data: profile } = useSuspenseQuery(profileQO());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [letra, setLetra] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  const create = useMutation({
    mutationFn: useServerFn(createWorkout),
    onSuccess: (r: { id: string }) => { qc.invalidateQueries({ queryKey: ["workouts"] }); navigate({ to: "/ficha/$id", params: { id: r.id } }); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteWorkout),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts"] }),
  });

  const logout = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--row-alt)]">
      <header className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[var(--yellow)] font-display text-2xl font-black leading-none">FICHA DE TREINO</div>
            <div className="text-xs text-gray-300 mt-0.5">{profile.personal_nome ?? "SEU NOME - PERSONAL TRAINER"}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setShowInstall(true)}><Download className="w-4 h-4"/></Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setShowProfile(true)}>Perfil</Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={logout}><LogOut className="w-4 h-4"/></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <div className="bg-white border border-black/10 mb-4">
          <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm">Novo Treino</div>
          <form onSubmit={(e) => { e.preventDefault(); if (!letra) return; create.mutate({ data: { letra } }); setLetra(""); }} className="p-3 flex gap-2">
            <Input placeholder="Letra (A, B, C...)" value={letra} onChange={e=>setLetra(e.target.value.slice(0,3))} className="uppercase w-40"/>
            <Button type="submit" disabled={create.isPending} className="bg-black hover:bg-black/90 text-white font-bold uppercase">
              <Plus className="w-4 h-4 mr-1"/>Criar
            </Button>
          </form>
        </div>

        {workouts.length === 0 ? (
          <div className="bg-white border border-black/10 p-8 text-center text-sm text-gray-500">
            Nenhuma ficha ainda. Crie o Treino A acima.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {workouts.map(w => (
              <div key={w.id} className="bg-white border border-black/10 flex overflow-hidden">
                <Link to="/ficha/$id" params={{ id: w.id }} className="bg-black text-[var(--yellow)] flex items-center justify-center w-24 font-display font-black text-5xl">
                  {w.letra}
                </Link>
                <div className="flex-1 p-3">
                  <div className="font-bold uppercase text-sm">Treino {w.letra}</div>
                  {w.nome && <div className="text-xs text-gray-500">{w.nome}</div>}
                  {w.data_inicio && <div className="text-xs text-gray-400 mt-1">Início: {new Date(w.data_inicio).toLocaleDateString("pt-BR")}</div>}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    <Link to="/ficha/$id/executar" params={{ id: w.id }} className="inline-flex items-center gap-1 bg-[var(--yellow)] text-black px-2 py-1 text-xs font-bold uppercase"><Play className="w-3 h-3"/>Executar</Link>
                    <Link to="/ficha/$id" params={{ id: w.id }} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 text-xs font-bold uppercase"><Pencil className="w-3 h-3"/>Editar</Link>
                    <Link to="/ficha/$id/historico" params={{ id: w.id }} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 text-xs font-bold uppercase"><History className="w-3 h-3"/>Histórico</Link>
                    <button onClick={() => { if (confirm("Excluir esta ficha?")) del.mutate({ data: { id: w.id } }); }} className="ml-auto text-red-600 p-1"><Trash2 className="w-3 h-3"/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showProfile && <ProfileDialog profile={profile} onClose={() => setShowProfile(false)}/>}
      {showInstall && <InstallDialog onClose={() => setShowInstall(false)}/>}
    </div>
  );
}

function ProfileDialog({ profile, onClose }: { profile: Awaited<ReturnType<typeof getProfile>>; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: profile.nome ?? "", objetivo: profile.objetivo ?? "",
    dias_semana: profile.dias_semana ?? "", observacao: profile.observacao ?? "",
    logo_texto: profile.logo_texto ?? "SuaLogo", personal_nome: profile.personal_nome ?? "",
  });
  const save = useMutation({
    mutationFn: useServerFn(updateProfile),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Salvo"); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase">Perfil</div>
        <form className="p-4 space-y-3" onSubmit={(e)=>{e.preventDefault();save.mutate({data:form});}}>
          <div><Label>Aluno</Label><Input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></div>
          <div><Label>Objetivo</Label><Input value={form.objetivo} onChange={e=>setForm({...form,objetivo:e.target.value})}/></div>
          <div><Label>Dias da Semana</Label><Input value={form.dias_semana} onChange={e=>setForm({...form,dias_semana:e.target.value})}/></div>
          <div><Label>Observação</Label><Input value={form.observacao} onChange={e=>setForm({...form,observacao:e.target.value})}/></div>
          <div><Label>Logo (texto)</Label><Input value={form.logo_texto} onChange={e=>setForm({...form,logo_texto:e.target.value})}/></div>
          <div><Label>Nome do Personal</Label><Input value={form.personal_nome} onChange={e=>setForm({...form,personal_nome:e.target.value})}/></div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1 bg-black text-white">Salvar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InstallDialog({ onClose }: { onClose: () => void }) {
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase">Instalar App</div>
        <div className="p-4 text-sm space-y-3">
          {isIOS ? (
            <>
              <p><b>iPhone / iPad:</b></p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Toque no ícone <b>Compartilhar</b> na barra do Safari</li>
                <li>Escolha <b>“Adicionar à Tela de Início”</b></li>
                <li>Toque em <b>Adicionar</b></li>
              </ol>
            </>
          ) : (
            <>
              <p><b>PC (Chrome / Edge):</b></p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Clique no ícone <b>Instalar</b> na barra de endereço</li>
                <li>Ou menu ⋮ → <b>Instalar Ficha de Treino…</b></li>
              </ol>
              <p className="pt-2"><b>Android:</b> menu ⋮ → <b>Instalar app</b>.</p>
            </>
          )}
          <Button onClick={onClose} className="w-full bg-black text-white mt-2">Ok</Button>
        </div>
      </div>
    </div>
  );
}
