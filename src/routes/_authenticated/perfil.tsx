import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, updateProfile } from "@/lib/workouts.functions";
import { useState } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";

const profileQO = () => queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });

export const Route = createFileRoute("/_authenticated/perfil")({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQO()),
  component: Perfil,
});

function Perfil() {
  const { data: profile } = useSuspenseQuery(profileQO());
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: profile.nome ?? "", objetivo: profile.objetivo ?? "",
    dias_semana: profile.dias_semana ?? "", observacao: profile.observacao ?? "",
    logo_texto: profile.logo_texto ?? "", personal_nome: profile.personal_nome ?? "",
  });
  const save = useMutation({
    mutationFn: useServerFn(updateProfile),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Perfil salvo"); },
  });

  const field = (label: string, key: keyof typeof form) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</label>
      <input
        value={form[key]}
        onChange={e=>setForm({...form,[key]:e.target.value})}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20"
      />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center"><User className="w-7 h-7"/></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Perfil</h1>
          <p className="text-sm text-zinc-500">Suas informações pessoais.</p>
        </div>
      </div>

      <form onSubmit={(e)=>{e.preventDefault();save.mutate({data:form});}} className="rounded-2xl border border-white/10 bg-[#111112] p-5 sm:p-6 space-y-4">
        {field("Nome", "nome")}
        {field("Objetivo", "objetivo")}
        {field("Dias da Semana", "dias_semana")}
        {field("Observação", "observacao")}
        {field("Nome do Personal", "personal_nome")}
        <button type="submit" disabled={save.isPending} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black px-5 py-3 font-bold text-sm hover:brightness-110 disabled:opacity-60">
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
