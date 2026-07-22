import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listAllUsers, setUserRole, assignStudent, createInvite, listInvites, deleteInvite, getMyRole, createStudent, type AppRole } from "@/lib/roles.functions";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Copy, Plus, Trash2 } from "lucide-react";

const usersQO = () => queryOptions({ queryKey: ["allUsers"], queryFn: () => listAllUsers() });
const invitesQO = () => queryOptions({ queryKey: ["invites"], queryFn: () => listInvites() });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });

export const Route = createFileRoute("/_authenticated/admin")({
  loader: async ({ context }) => {
    const r = await context.queryClient.ensureQueryData(roleQO());
    if (r.role !== "admin") throw redirect({ to: "/app" });
    context.queryClient.ensureQueryData(usersQO());
    context.queryClient.ensureQueryData(invitesQO());
  },
  component: AdminPage,
});

function AdminPage() {
  const { data: users } = useSuspenseQuery(usersQO());
  const { data: invites } = useSuspenseQuery(invitesQO());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"professores" | "alunos" | "convites">("professores");
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel("presence:professores", { config: { presence: { key: "user" } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, Array<{ user_id: string }>>;
        const ids = new Set<string>();
        Object.values(state).forEach(arr => arr.forEach(p => p.user_id && ids.add(p.user_id)));
        setOnline(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data } = await supabase.auth.getUser();
          if (data.user) await channel.track({ user_id: data.user.id });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  const professors = users.filter(u => u.role === "professor" || u.role === "admin");
  const alunos = users.filter(u => u.role === "aluno");

  const changeRole = useMutation({
    mutationFn: useServerFn(setUserRole),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["allUsers"] }); toast.success("Papel atualizado"); },
    onError: (e) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: useServerFn(assignStudent),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["allUsers"] }); toast.success("Aluno atribuído"); },
    onError: (e) => toast.error(e.message),
  });

  const createInv = useMutation({
    mutationFn: useServerFn(createInvite),
    onSuccess: (r: { code: string }) => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      const link = `${window.location.origin}/auth?convite=${r.code}`;
      navigator.clipboard?.writeText(link).catch(()=>{});
      toast.success(`Convite ${r.code} criado (link copiado)`);
    },
  });

  const delInv = useMutation({
    mutationFn: useServerFn(deleteInvite),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });

  return (
    <div className="min-h-screen bg-[var(--row-alt)]">
      <header className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate({ to: "/app" })} className="text-white/70 hover:text-white"><ArrowLeft className="w-4 h-4"/></button>
          <div className="text-[var(--yellow)] font-display text-xl font-black">ADMIN</div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 pt-3 flex gap-1">
        {(["professores","alunos","convites"] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-2 text-xs font-bold uppercase ${tab===t?"bg-[var(--yellow)] text-black":"bg-white text-gray-500"}`}>{t}</button>
        ))}
      </div>

      <main className="max-w-5xl mx-auto p-3 sm:p-4">
        {tab === "professores" && (
          <div className="bg-white border border-black/10">
            <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm">Professores & Admins</div>
            <div className="overflow-x-auto -mx-px">
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-gray-100 text-left"><tr><th className="p-2 whitespace-nowrap">Nome</th><th className="p-2 whitespace-nowrap">Papel</th><th className="p-2 whitespace-nowrap">Online</th><th className="p-2 whitespace-nowrap">Ações</th></tr></thead>
                <tbody>
                  {professors.map(u => (
                    <tr key={u.id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{u.nome ?? "-"}</td>
                      <td className="p-2 whitespace-nowrap"><Badge role={u.role}/></td>
                      <td className="p-2 whitespace-nowrap">{online.has(u.id) ? <span className="inline-block w-2 h-2 rounded-full bg-green-500"/> : <span className="inline-block w-2 h-2 rounded-full bg-gray-300"/>}</td>
                      <td className="p-2 whitespace-nowrap">
                        <select className="border px-1 py-0.5 text-xs" value={u.role} onChange={e => changeRole.mutate({ data: { user_id: u.id, role: e.target.value as AppRole } })}>
                          <option value="admin">admin</option>
                          <option value="professor">professor</option>
                          <option value="aluno">aluno</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {professors.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Nenhum professor. Crie um convite na aba Convites.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "alunos" && (
          <div className="space-y-3">
            <AdminNewStudent />
            <div className="bg-white border border-black/10">
              <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm">Alunos</div>
              <div className="overflow-x-auto -mx-px">
                <table className="w-full text-sm min-w-[520px]">
                  <thead className="bg-gray-100 text-left"><tr><th className="p-2 whitespace-nowrap">Nome</th><th className="p-2 whitespace-nowrap">Professor</th><th className="p-2 whitespace-nowrap">Ações</th></tr></thead>
                  <tbody>
                    {alunos.map(u => (
                      <tr key={u.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">{u.nome ?? "-"}</td>
                        <td className="p-2 whitespace-nowrap">
                          <select className="border px-1 py-0.5 text-xs max-w-[180px]" value={u.teacher_id ?? ""} onChange={e => assign.mutate({ data: { student_id: u.id, teacher_id: e.target.value || null } })}>
                            <option value="">— sem professor —</option>
                            {professors.map(p => <option key={p.id} value={p.id}>{p.nome ?? p.id.slice(0,8)}</option>)}
                          </select>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => changeRole.mutate({ data: { user_id: u.id, role: "professor" } })}>Promover a professor</Button>
                        </td>
                      </tr>
                    ))}
                    {alunos.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-500">Nenhum aluno.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "convites" && (
          <div className="bg-white border border-black/10">
            <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm flex flex-wrap items-center justify-between gap-2">
              <span>Convites</span>
              <Button size="sm" onClick={() => createInv.mutate({ data: { role: "professor" } })} className="bg-black text-white h-7"><Plus className="w-3 h-3 mr-1"/>Novo convite</Button>
            </div>
            <div className="overflow-x-auto -mx-px">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-gray-100 text-left"><tr><th className="p-2 whitespace-nowrap">Código</th><th className="p-2 whitespace-nowrap">Papel</th><th className="p-2 whitespace-nowrap">Usado por</th><th className="p-2 whitespace-nowrap">Expira</th><th className="p-2"></th></tr></thead>
                <tbody>
                  {invites.map(i => {
                    const link = `${window.location.origin}/auth?convite=${i.code}`;
                    return (
                      <tr key={i.id} className="border-t">
                        <td className="p-2 font-mono whitespace-nowrap">{i.code}</td>
                        <td className="p-2 whitespace-nowrap"><Badge role={i.role as AppRole}/></td>
                        <td className="p-2 text-xs whitespace-nowrap">{i.used_by ? "usado" : "livre"}</td>
                        <td className="p-2 text-xs text-gray-500 whitespace-nowrap">{i.expires_at ? new Date(i.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                        <td className="p-2 flex gap-1 whitespace-nowrap">
                          <Button size="sm" variant="outline" className="h-7" onClick={() => { navigator.clipboard?.writeText(link); toast.success("Link copiado"); }}><Copy className="w-3 h-3"/></Button>
                          <Button size="sm" variant="outline" className="h-7 text-red-600" onClick={() => delInv.mutate({ data: { id: i.id } })}><Trash2 className="w-3 h-3"/></Button>
                        </td>
                      </tr>
                    );
                  })}
                  {invites.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhum convite ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>


      <div className="max-w-5xl mx-auto px-4 pb-6 text-xs text-gray-500">
        <Link to="/app" className="underline">Voltar ao app</Link>
      </div>
    </div>
  );
}

function Badge({ role }: { role: AppRole }) {
  const map: Record<AppRole, string> = { admin: "bg-red-600 text-white", professor: "bg-black text-[var(--yellow)]", aluno: "bg-gray-200 text-black" };
  return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${map[role]}`}>{role}</span>;
}

function AdminNewStudent() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: useServerFn(createStudent),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      setNome(""); setEmail(""); setPassword(""); setOpen(false);
      toast.success("Aluno cadastrado");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="bg-white border border-black/10">
      <button onClick={()=>setOpen(o=>!o)} className="w-full bg-black text-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm text-left flex items-center gap-2">
        <Plus className="w-4 h-4"/>{open ? "Fechar" : "Cadastrar novo aluno"}
      </button>
      {open && (
        <form onSubmit={(e)=>{e.preventDefault(); if(!nome||!email||password.length<6) return; create.mutate({ data: { nome, email, password } });}} className="p-3 grid gap-2 md:grid-cols-4">
          <Input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} maxLength={120}/>
          <Input placeholder="E-mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={255}/>
          <Input placeholder="Senha (mín. 6)" type="text" value={password} onChange={e=>setPassword(e.target.value)} maxLength={128}/>
          <Button type="submit" disabled={create.isPending} className="bg-[var(--yellow)] text-black font-bold uppercase">Cadastrar</Button>
          <p className="md:col-span-4 text-[10px] text-gray-500">O aluno usará esse e-mail e senha. Depois atribua a um professor abaixo.</p>
        </form>
      )}
    </div>
  );
}
