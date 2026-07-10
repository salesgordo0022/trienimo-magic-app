import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/workouts.functions";
import { getMyRole } from "@/lib/roles.functions";
import { Home, Dumbbell, TrendingUp, Calendar, MessageSquare, User, Settings, LogOut, Menu, X, Bell, Shield, Users } from "lucide-react";
import { useState } from "react";
import imperialLogo from "@/assets/imperial-logo.png.asset.json";

const profileQO = () => queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });
const roleQO = () => queryOptions({ queryKey: ["myRole"], queryFn: () => getMyRole() });

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; };

const NAV: NavItem[] = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/meu-treino", label: "Meu Treino", icon: Dumbbell },
  { to: "/progresso", label: "Progresso", icon: TrendingUp },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function Shell() {
  const [open, setOpen] = useState(false);
  const { data: profile } = useQuery(profileQO());
  const { data: role } = useQuery(roleQO());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });

  const logout = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const firstName = (profile?.nome ?? "Atleta").split(" ")[0];
  const initials = firstName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex" style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-[260px] bg-[#0d0d0f] border-r border-white/5 z-50 flex flex-col transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo area */}
        <div className="relative px-4 pt-5 pb-6 border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--lime)]/40 to-transparent"/>
          <button className="lg:hidden absolute top-3 right-3 text-zinc-500 hover:text-white" onClick={() => setOpen(false)}><X className="w-5 h-5"/></button>
          <Logo/>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Menu</div>
          {NAV.map(item => {
            const active = pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-[var(--lime)] text-black shadow-[0_10px_30px_-8px_rgba(204,255,0,0.55)]"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {active && <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[var(--lime)] shadow-[0_0_12px_rgba(204,255,0,0.8)]"/>}
                <Icon className="w-[18px] h-[18px]"/>{item.label}
              </Link>
            );
          })}
          {(role?.role === "admin" || role?.role === "professor") && (
            <>
              <div className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Gestão</div>
              {role?.role === "admin" && (
                <Link to="/admin" onClick={()=>setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5">
                  <Shield className="w-[18px] h-[18px]"/>Admin
                </Link>
              )}
              <Link to="/professor" onClick={()=>setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5">
                <Users className="w-[18px] h-[18px]"/>Alunos
              </Link>
            </>
          )}
        </nav>

        <div className="px-3 pb-5 pt-3 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--lime)] to-[#88b800] flex items-center justify-center text-black font-black text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{firstName}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">{role?.role ?? "aluno"}</div>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-all">
            <LogOut className="w-[18px] h-[18px]"/>Sair
          </button>
        </div>
      </aside>

      {open && <div onClick={()=>setOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden"/>}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 safe-top">
          <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
            <button className="lg:hidden text-zinc-300" onClick={() => setOpen(true)}><Menu className="w-5 h-5"/></button>
            <div className="min-w-0 flex-1">
              <div className="text-lg sm:text-xl font-black leading-tight truncate">
                Olá, {firstName}! <span className="inline-block">👋</span>
              </div>
              <div className="text-xs text-zinc-500 truncate">Bora treinar hoje?</div>
            </div>
            <button aria-label="Notificações" className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white">
              <Bell className="w-[18px] h-[18px]"/>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--lime)]"/>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--lime)] to-[#88b800] flex items-center justify-center text-black font-black text-sm shrink-0">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet/>
        </main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <Link to="/app" className="flex items-center justify-center w-full py-1">
      <img src={imperialLogo.url} alt="Imperial Fitness" className="h-16 w-auto object-contain drop-shadow-[0_0_20px_rgba(204,255,0,0.35)]"/>
    </Link>
  );
}
