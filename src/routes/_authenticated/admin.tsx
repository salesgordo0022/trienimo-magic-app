import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useMemo } from "react";
import {
  listAllUsers, setUserRole, assignStudent, createInvite, listInvites,
  deleteInvite, getMyRole, createStudent, fixUserRoleByEmail, type AppRole,
} from "@/lib/roles.functions";
import { translateAllCatalogExercises, translateAllWorkoutExercises } from "@/lib/exercisedb.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Plus, Trash2, Search, Shield, Users, User,
  ChevronDown, ChevronRight, X, Loader2, Check, Link2, UserPlus,
  Crown, Dumbbell, Eye, EyeOff,
} from "lucide-react";

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
  const [tab, setTab] = useState<"usuarios" | "convites">("usuarios");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | AppRole>("all");
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel("presence:admin", { config: { presence: { key: "user" } } });
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

  const filteredUsers = useMemo(() => {
    let list = users;
    if (filterRole !== "all") list = list.filter(u => u.role === filterRole);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => (u.nome ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [users, filterRole, search]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role === "admin").length,
    professors: users.filter(u => u.role === "professor").length,
    alunos: users.filter(u => u.role === "aluno").length,
    online: online.size,
  }), [users, online]);

  const changeRole = useMutation({
    mutationFn: useServerFn(setUserRole),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["allUsers"] }); toast.success("Papel atualizado"); },
    onError: (e) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: useServerFn(assignStudent),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["allUsers"] }); toast.success("Aluno atribuido"); },
    onError: (e) => toast.error(e.message),
  });

  const createInv = useMutation({
    mutationFn: useServerFn(createInvite),
    onSuccess: (r: { code: string }) => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      const link = `${window.location.origin}/auth?convite=${r.code}`;
      navigator.clipboard?.writeText(link).catch(() => {});
      toast.success(`Convite criado (link copiado)`);
    },
  });

  const delInv = useMutation({
    mutationFn: useServerFn(deleteInvite),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invites"] }); toast.success("Convite excluido"); },
  });

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-[#0a0a0a]/85 backdrop-blur-xl border-b border-white/5 safe-top safe-x">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate({ to: "/app" })} className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black uppercase tracking-widest text-[var(--lime)]">Painel Admin</h1>
            <p className="text-[11px] text-zinc-500">Gerenciar contas e permissoes</p>
          </div>
          <Link to="/app" className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-colors">
            <Dumbbell className="w-[18px] h-[18px]" />
          </Link>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Total", value: stats.total, icon: Users, color: "text-white" },
              { label: "Admins", value: stats.admins, icon: Crown, color: "text-red-400" },
              { label: "Professores", value: stats.professors, icon: Shield, color: "text-[var(--lime)]" },
              { label: "Alunos", value: stats.alunos, icon: User, color: "text-blue-400" },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-[#111112] p-3 text-center">
                <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Fix Role by Email */}
          <FixRoleByEmail />
          {/* Translate All Exercises */}
          <TranslateExercises />

          {/* Tabs */}
          <div className="flex gap-2">
            {([
              { key: "usuarios" as const, label: "Usuarios", icon: Users, count: stats.total },
              { key: "convites" as const, label: "Convites", icon: Link2, count: invites.length },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  tab === t.key
                    ? "bg-[var(--lime)] text-black"
                    : "bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? "bg-black/15 text-black" : "bg-white/5 text-zinc-500"
                }`}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Tab: Usuarios */}
          {tab === "usuarios" && (
            <div className="space-y-3">
              <NewStudentForm />

              {/* Search + Filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome..."
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[var(--lime)]/30 transition-colors"
                  />
                </div>
                <div className="relative">
                  <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value as any)}
                    className="appearance-none bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 pr-8 text-sm text-white outline-none focus:border-[var(--lime)]/30 transition-colors cursor-pointer"
                  >
                    <option value="all">Todos</option>
                    <option value="admin">Admins</option>
                    <option value="professor">Professores</option>
                    <option value="aluno">Alunos</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              {/* User List */}
              {filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#111112] p-10 text-center">
                  <Users className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Nenhum usuario encontrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(u => (
                    <UserCard
                      key={u.id}
                      user={u}
                      professors={professors}
                      isOnline={online.has(u.id)}
                      onChangeRole={(role) => changeRole.mutate({ data: { user_id: u.id, role } })}
                      onAssignTeacher={(teacherId) => assign.mutate({ data: { student_id: u.id, teacher_id: teacherId } })}
                      isPending={changeRole.isPending || assign.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Convites */}
          {tab === "convites" && (
            <div className="space-y-3">
              <CreateInviteButton onCreate={(role) => createInv.mutate({ data: { role } })} isPending={createInv.isPending} />

              {invites.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#111112] p-10 text-center">
                  <Link2 className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Nenhum convite ainda.</p>
                  <p className="text-xs text-zinc-600 mt-1">Crie um convite acima para compartilhar.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invites.map(inv => (
                    <InviteCard
                      key={inv.id}
                      invite={inv}
                      onCopy={() => {
                        navigator.clipboard?.writeText(`${window.location.origin}/auth?convite=${inv.code}`);
                        toast.success("Link copiado!");
                      }}
                      onDelete={() => {
                        if (confirm("Excluir este convite?")) delInv.mutate({ data: { id: inv.id } });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── User Card ─── */
function UserCard({
  user,
  professors,
  isOnline,
  onChangeRole,
  onAssignTeacher,
  isPending,
}: {
  user: any;
  professors: any[];
  isOnline: boolean;
  onChangeRole: (role: AppRole) => void;
  onAssignTeacher: (teacherId: string | null) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const roleConfig: Record<AppRole, { label: string; color: string; bg: string; icon: any }> = {
    admin: { label: "Admin", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: Crown },
    professor: { label: "Professor", color: "text-[var(--lime)]", bg: "bg-[var(--lime)]/10 border-[var(--lime)]/20", icon: Shield },
    aluno: { label: "Aluno", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: User },
  };

  const rc = roleConfig[user.role as AppRole];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
      {/* Main row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] active:bg-white/[0.04] transition-all text-left"
      >
        {/* Avatar */}
        <div className={`relative w-11 h-11 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
          user.role === "admin" ? "bg-red-500/15 text-red-400 border border-red-500/20"
          : user.role === "professor" ? "bg-[var(--lime)]/15 text-[var(--lime)] border border-[var(--lime)]/20"
          : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
        }`}>
          {(user.nome ?? "?")[0]?.toUpperCase() ?? "?"}
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#111112]" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">{user.nome ?? "(sem nome)"}</span>
            {user.role === "admin" && <Crown className="w-3 h-3 text-red-400 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${rc.bg} ${rc.color}`}>
              <rc.icon className="w-2.5 h-2.5" />
              {rc.label}
            </span>
            {user.role === "aluno" && user.teacher_nome && (
              <span className="text-[10px] text-zinc-500 truncate">
                Prof: {user.teacher_nome}
              </span>
            )}
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Role selector */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Papel</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["admin", "professor", "aluno"] as const).map(role => {
                const cfg = roleConfig[role];
                const active = user.role === role;
                return (
                  <button
                    key={role}
                    onClick={() => !isPending && onChangeRole(role)}
                    disabled={isPending || active}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-all ${
                      active
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-white hover:bg-white/[0.04]"
                    } ${isPending ? "opacity-50" : ""}`}
                  >
                    {isPending && active ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <cfg.icon className="w-4 h-4" />
                    )}
                    <span className="text-[10px] font-bold uppercase">{cfg.label}</span>
                    {active && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teacher assignment (only for alunos) */}
          {user.role === "aluno" && (
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Professor vinculado</label>
              <div className="relative">
                <select
                  value={user.teacher_id ?? ""}
                  onChange={e => onAssignTeacher(e.target.value || null)}
                  disabled={isPending}
                  className="appearance-none w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 pr-8 text-sm text-white outline-none focus:border-[var(--lime)]/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <option value="">— sem professor —</option>
                  {professors.map(p => (
                    <option key={p.id} value={p.id}>{p.nome ?? p.id.slice(0, 8)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Invite Card ─── */
function InviteCard({
  invite,
  onCopy,
  onDelete,
}: {
  invite: any;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
  const isUsed = !!invite.used_by;

  const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
    admin: { label: "Admin", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    professor: { label: "Professor", color: "text-[var(--lime)]", bg: "bg-[var(--lime)]/10 border-[var(--lime)]/20" },
    aluno: { label: "Aluno", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  };
  const rc = roleConfig[invite.role] ?? roleConfig.aluno;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111112] p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
        <Link2 className="w-5 h-5 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-300">{invite.code}</span>
          <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${rc.bg} ${rc.color}`}>
            {rc.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {isUsed ? (
            <span className="text-[10px] text-yellow-500 font-bold uppercase">Usado</span>
          ) : isExpired ? (
            <span className="text-[10px] text-red-400 font-bold uppercase">Expirado</span>
          ) : (
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Ativo</span>
          )}
          {invite.expires_at && (
            <span className="text-[10px] text-zinc-600">
              Exp: {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={onCopy}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Create Invite Button ─── */
function CreateInviteButton({ onCreate, isPending }: { onCreate: (role: AppRole) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<AppRole>("professor");

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/10 flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5 text-[var(--lime)]" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-bold text-white">Criar Convite</div>
          <div className="text-[11px] text-zinc-500">Gerar link de convite para novos usuarios</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Papel do convite</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { key: "professor" as const, label: "Professor", color: "text-[var(--lime)]" },
                { key: "aluno" as const, label: "Aluno", color: "text-blue-400" },
                { key: "admin" as const, label: "Admin", color: "text-red-400" },
              ]).map(r => (
                <button
                  key={r.key}
                  onClick={() => setRole(r.key)}
                  className={`py-2.5 rounded-xl border text-xs font-bold uppercase text-center transition-all ${
                    role === r.key
                      ? `border-current ${r.color} bg-white/[0.04]`
                      : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { onCreate(role); setOpen(false); }}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black px-4 py-3 font-bold text-sm hover:brightness-110 disabled:opacity-60 transition-all"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isPending ? "Criando..." : "Criar Convite"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Fix Role by Email ─── */
function FixRoleByEmail() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("professor");
  const fix = useMutation({
    mutationFn: useServerFn(fixUserRoleByEmail),
    onSuccess: (r: { email?: string; role?: string }) => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      setEmail("");
      toast.success(`${r.email ?? ""} agora e ${r.role ?? ""}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-bold text-white">Corrigir Papel por Email</div>
          <div className="text-[11px] text-zinc-500">Forcar papel de um usuario pelo email</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <input
            type="email"
            placeholder="Email do usuario"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[var(--lime)]/30 transition-colors"
          />
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { key: "professor" as const, label: "Professor", color: "text-[var(--lime)]" },
              { key: "aluno" as const, label: "Aluno", color: "text-blue-400" },
              { key: "admin" as const, label: "Admin", color: "text-red-400" },
            ]).map(r => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`py-2 rounded-xl border text-xs font-bold uppercase text-center transition-all ${
                  role === r.key
                    ? `border-current ${r.color} bg-white/[0.04]`
                    : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (email) fix.mutate({ data: { email, role } }); }}
            disabled={fix.isPending || !email}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-yellow-400 text-black px-4 py-2.5 font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {fix.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {fix.isPending ? "Aplicando..." : "Corrigir Papel"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── New Student Form ─── */
/* ─── Translate All Exercises ─── */
function TranslateExercises() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState<string | null>(null);
  const [workoutStatus, setWorkoutStatus] = useState<string | null>(null);
  const catalogMut = useMutation({
    mutationFn: useServerFn(translateAllCatalogExercises),
    onSuccess: (r: any) => {
      setCatalogStatus(`Catálogo: ${r.total} exercícios, ${r.ok} traduzidos, ${r.fail} falhas`);
      qc.invalidateQueries({ queryKey: ["sync"] });
    },
    onError: (e) => { setCatalogStatus(`Erro: ${e.message}`); },
  });
  const workoutMut = useMutation({
    mutationFn: useServerFn(translateAllWorkoutExercises),
    onSuccess: (r: any) => {
      setWorkoutStatus(`Fichas: ${r.total} exercícios, ${r.ok} traduzidos, ${r.fail} falhas`);
    },
    onError: (e) => { setWorkoutStatus(`Erro: ${e.message}`); },
  });

  const busy = catalogMut.isPending || workoutMut.isPending;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <Dumbbell className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-bold text-white">Traduzir Todos os Exercícios</div>
          <div className="text-[11px] text-zinc-500">Traduzir catálogo + exercícios em fichas para português</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <p className="text-xs text-zinc-500">
            Traduz todos os exercícios da biblioteca e das fichas para português usando dicionário + API.
            Pode levar alguns minutos.
          </p>
          <button
            onClick={() => { setCatalogStatus("Traduzindo..."); catalogMut.mutate({}); }}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 text-white px-4 py-2.5 font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {catalogMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dumbbell className="w-4 h-4" />}
            {catalogMut.isPending ? "Traduzindo catálogo..." : "Traduzir Biblioteca (catálogo)"}
          </button>
          {catalogStatus && (
            <div className={`text-xs px-3 py-2 rounded-lg ${catalogStatus.startsWith("Erro") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              {catalogStatus}
            </div>
          )}
          <button
            onClick={() => { setWorkoutStatus("Traduzindo..."); workoutMut.mutate({}); }}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 text-white px-4 py-2.5 font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {workoutMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dumbbell className="w-4 h-4" />}
            {workoutMut.isPending ? "Traduzindo fichas..." : "Traduzir Exercícios nas Fichas"}
          </button>
          {workoutStatus && (
            <div className={`text-xs px-3 py-2 rounded-lg ${workoutStatus.startsWith("Erro") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              {workoutStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── New Student Form ─── */
function NewStudentForm() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const create = useMutation({
    mutationFn: useServerFn(createStudent),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      setNome(""); setEmail(""); setPassword(""); setOpen(false);
      toast.success("Aluno cadastrado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--lime)] flex items-center justify-center shrink-0">
          <Plus className="w-5 h-5 text-black" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-bold text-white">Cadastrar Aluno</div>
          <div className="text-[11px] text-zinc-500">Criar nova conta de aluno</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <input
            placeholder="Nome completo"
            value={nome}
            onChange={e => setNome(e.target.value)}
            maxLength={120}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[var(--lime)]/30 transition-colors"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={255}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[var(--lime)]/30 transition-colors"
          />
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Senha (min. 6 caracteres)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              maxLength={128}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[var(--lime)]/30 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => {
              if (!nome.trim() || !email.trim() || password.length < 6) {
                toast.error("Preencha todos os campos. Senha minima: 6 caracteres.");
                return;
              }
              create.mutate({ data: { nome: nome.trim(), email: email.trim(), password } });
            }}
            disabled={create.isPending || !nome.trim() || !email.trim() || password.length < 6}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black px-4 py-3 font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {create.isPending ? "Cadastrando..." : "Cadastrar Aluno"}
          </button>
        </div>
      )}
    </div>
  );
}
