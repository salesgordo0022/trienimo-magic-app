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
        {(["professores","alunos","convites","exercicios"] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-2 text-xs font-bold uppercase ${tab===t?"bg-[var(--yellow)] text-black":"bg-white text-gray-500"}`}>{t}</button>
        ))}
      </div>

      <main className="max-w-5xl mx-auto p-4">
        {tab === "professores" && (
          <div className="bg-white border border-black/10">
            <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm">Professores & Admins</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left"><tr><th className="p-2">Nome</th><th className="p-2">Papel</th><th className="p-2">Online</th><th className="p-2">Ações</th></tr></thead>
              <tbody>
                {professors.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2">{u.nome ?? "-"}</td>
                    <td className="p-2"><Badge role={u.role}/></td>
                    <td className="p-2">{online.has(u.id) ? <span className="inline-block w-2 h-2 rounded-full bg-green-500"/> : <span className="inline-block w-2 h-2 rounded-full bg-gray-300"/>}</td>
                    <td className="p-2">
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
        )}

        {tab === "alunos" && (
          <div className="space-y-3">
            <AdminNewStudent />
            <div className="bg-white border border-black/10">
              <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm">Alunos</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left"><tr><th className="p-2">Nome</th><th className="p-2">Professor</th><th className="p-2">Ações</th></tr></thead>
              <tbody>
                {alunos.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2">{u.nome ?? "-"}</td>
                    <td className="p-2">
                      <select className="border px-1 py-0.5 text-xs" value={u.teacher_id ?? ""} onChange={e => assign.mutate({ data: { student_id: u.id, teacher_id: e.target.value || null } })}>
                        <option value="">— sem professor —</option>
                        {professors.map(p => <option key={p.id} value={p.id}>{p.nome ?? p.id.slice(0,8)}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <Button size="sm" variant="outline" onClick={() => changeRole.mutate({ data: { user_id: u.id, role: "professor" } })}>Promover a professor</Button>
                    </td>
                  </tr>
                ))}
                {alunos.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-500">Nenhum aluno.</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {tab === "convites" && (
          <div className="bg-white border border-black/10">
            <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm flex items-center justify-between">
              Convites
              <Button size="sm" onClick={() => createInv.mutate({ data: { role: "professor" } })} className="bg-black text-white h-7"><Plus className="w-3 h-3 mr-1"/>Novo convite de professor</Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left"><tr><th className="p-2">Código</th><th className="p-2">Papel</th><th className="p-2">Usado por</th><th className="p-2">Expira</th><th className="p-2"></th></tr></thead>
              <tbody>
                {invites.map(i => {
                  const link = `${window.location.origin}/auth?convite=${i.code}`;
                  return (
                    <tr key={i.id} className="border-t">
                      <td className="p-2 font-mono">{i.code}</td>
                      <td className="p-2"><Badge role={i.role as AppRole}/></td>
                      <td className="p-2 text-xs">{i.used_by ? "usado" : "livre"}</td>
                      <td className="p-2 text-xs text-gray-500">{i.expires_at ? new Date(i.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="p-2 flex gap-1">
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
        )}

        {tab === "exercicios" && <ExerciseSyncPanel />}
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

function ExerciseSyncPanel() {
  const qc = useQueryClient();
  const progressQO = () => queryOptions({ queryKey: ["syncProgress"], queryFn: () => getSyncProgress(), refetchInterval: 2000 });
  const { data: progress } = useSuspenseQuery(progressQO()) as { data: { total: number; withGif: number; pending: number } };
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const meta = useMutation({
    mutationFn: useServerFn(importExerciseMetadata),
    onSuccess: (r: any) => { toast.success(`Metadados importados: ${r.imported}`); qc.invalidateQueries({ queryKey: ["syncProgress"] }); },
    onError: (e) => toast.error(e.message),
  });

  const runAll = async () => {
    setRunning(true);
    setLog(["Iniciando download dos GIFs..."]);
    try {
      // primeiro garante metadados
      const p = await getSyncProgress();
      if (p.total === 0) {
        setLog(l => [...l, "Importando metadados..."]);
        const r = await importExerciseMetadata();
        setLog(l => [...l, `Metadados: ${r.imported} exercícios`]);
      }
      let safety = 500;
      while (safety-- > 0) {
        const r: any = await importGifsBatch({ data: { batchSize: 8 } });
        setLog(l => [...l.slice(-40), `+${r.processed} GIFs (falhas ${r.failed}), faltam ${r.pending}`]);
        qc.invalidateQueries({ queryKey: ["syncProgress"] });
        if (r.done) { setLog(l => [...l, "✅ Sincronização concluída!"]); break; }
      }
    } catch (e: any) {
      setLog(l => [...l, `ERRO: ${e.message}`]);
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.withGif / progress.total) * 100) : 0;

  return (
    <div className="bg-white border border-black/10">
      <div className="bg-[var(--yellow)] px-3 py-2 font-display font-black uppercase text-sm">Biblioteca de Exercícios</div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-100 p-3"><div className="text-2xl font-black">{progress.total}</div><div className="text-[10px] uppercase text-gray-500">Total</div></div>
          <div className="bg-gray-100 p-3"><div className="text-2xl font-black text-green-600">{progress.withGif}</div><div className="text-[10px] uppercase text-gray-500">Com GIF</div></div>
          <div className="bg-gray-100 p-3"><div className="text-2xl font-black text-orange-500">{progress.pending}</div><div className="text-[10px] uppercase text-gray-500">Pendentes</div></div>
        </div>
        <div className="h-3 bg-gray-200 rounded overflow-hidden">
          <div className="h-full bg-[var(--yellow)] transition-all" style={{ width: `${pct}%` }}/>
        </div>
        <div className="text-xs text-gray-500">{pct}% concluído — após sincronizar, o sistema deixa de usar a API externa.</div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => meta.mutate({} as any)} disabled={meta.isPending || running} variant="outline">
            1. Importar metadados
          </Button>
          <Button onClick={runAll} disabled={running || progress.pending === 0} className="bg-black text-[var(--yellow)] font-bold uppercase">
            {running ? "Baixando GIFs..." : progress.pending === 0 && progress.total > 0 ? "✅ Tudo sincronizado" : "2. Baixar todos os GIFs"}
          </Button>
        </div>
        {log.length > 0 && (
          <div className="bg-black text-green-400 font-mono text-[10px] p-2 max-h-40 overflow-auto">
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
