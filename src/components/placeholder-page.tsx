import { createFileRoute } from "@tanstack/react-router";
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export function Placeholder({ title, icon: Icon, subtitle }: { title: string; icon: LucideIcon | ComponentType<{ className?: string }>; subtitle: string }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="rounded-3xl border border-white/10 bg-[#111112] p-10 sm:p-14 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--lime)]/15 text-[var(--lime)] flex items-center justify-center mb-4">
          <Icon className="w-8 h-8"/>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">{title}</h1>
        <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">{subtitle}</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--lime)]/10 text-[var(--lime)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
          Em breve
        </div>
      </div>
    </div>
  );
}

// dummy export so file isn't treated as a route
export const _shared = true;
export { createFileRoute };
