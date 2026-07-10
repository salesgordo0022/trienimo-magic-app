import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/workouts.functions";
import { getMyRole } from "@/lib/roles.functions";
import { Home, Dumbbell, TrendingUp, MessageSquare, User, Bell, LogOut, Shield, Users } from "lucide-react";
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

const NAV = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/meu-treino", label: "Treino", icon: Dumbbell },
  { to: "/progresso", label: "Progresso", icon: TrendingUp },
  { to: "/mensagens", label: "Chat", icon: MessageSquare },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

function Shell() {
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
  const isStaff = role?.role === "admin" || role?.role === "professor";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/85 backdrop-blur-xl border-b border-white/5 safe-top">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/app" className="shrink-0">
            <img src={imperialLogo.url} alt="Imperial Fitness" className="h-10 w-auto object-contain drop-shadow-[0_0_16px_rgba(204,255,0,0.35)]"/>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-black leading-tight truncate">Olá, {firstName}! 👋</div>
            <div className="text-[11px] text-zinc-500 truncate">Bora treinar hoje?</div>
          </div>
          {isStaff && (
            <>
              {role?.role === "admin" && (
                <Link to="/admin" aria-label="Admin" className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white">
                  <Shield className="w-[18px] h-[18px]"/>
                </Link>
              )}
              <Link to="/professor" aria-label="Alunos" className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white">
                <Users className="w-[18px] h-[18px]"/>
              </Link>
            </>
          )}
          <button aria-label="Notificações" className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white">
            <Bell className="w-[18px] h-[18px]"/>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--lime)]"/>
          </button>
          <button onClick={logout} aria-label="Sair" className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-red-400">
            <LogOut className="w-[18px] h-[18px]"/>
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--lime)] to-[#88b800] flex items-center justify-center text-black font-black text-xs shrink-0">
            {initials}
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0 pb-24">
        <div className="max-w-3xl mx-auto">
          <Outlet/>
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0d0d0f]/95 backdrop-blur-xl border-t border-white/10 safe-bottom">
        <div className="max-w-3xl mx-auto grid grid-cols-5 gap-1 px-2 py-2">
          {NAV.map(item => {
            const active = pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                  active ? "text-black bg-[var(--lime)] shadow-[0_8px_24px_-6px_rgba(204,255,0,0.55)]" : "text-zinc-400"
                }`}
              >
                <Icon className="w-5 h-5"/>
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
