import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  generateNutritionPlan,
  type MealPlanResult,
} from "@/lib/nutrition.functions";
import {
  Apple,
  Flame,
  Loader2,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alimentacao")({
  ssr: false,
  component: AlimentacaoPage,
});

const MEAL_ICONS: Record<string, { icon: string; color: string }> = {
  "Café da manhã": { icon: "\u{1F305}", color: "from-amber-500/15 to-amber-900/5" },
  "Lanche da manhã": { icon: "\u{1F34E}", color: "from-pink-500/15 to-pink-900/5" },
  Almoço: { icon: "\u{2600}\u{FE0F}", color: "from-emerald-500/15 to-emerald-900/5" },
  "Lanche da tarde": { icon: "\u{1F352}", color: "from-orange-500/15 to-orange-900/5" },
  Jantar: { icon: "\u{1F319}", color: "from-blue-500/15 to-blue-900/5" },
  Ceia: { icon: "\u{1F95E}", color: "from-purple-500/15 to-purple-900/5" },
};

const DEFAULT_MEAL = { icon: "\u{1F37D}\u{FE0F}", color: "from-zinc-500/15 to-zinc-900/5" };

function AlimentacaoPage() {
  const [plano, setPlano] = useState<MealPlanResult | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [peso, setPeso] = useState(70);
  const [altura, setAltura] = useState(175);
  const [idade, setIdade] = useState(25);
  const [sexo, setSexo] = useState<"male" | "female">("male");
  const [objetivo, setObjetivo] = useState<"lose_weight" | "gain_muscle" | "maintain">("gain_muscle");

  const genPlan = useMutation({
    mutationFn: useServerFn(generateNutritionPlan),
    onSuccess: (data: MealPlanResult) => {
      setPlano(data);
      toast.success("Plano alimentar gerado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goalLabels: Record<string, string> = {
    lose_weight: "Perder peso",
    gain_muscle: "Ganhar massa",
    maintain: "Manter peso",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
          <Apple className="w-7 h-7 text-[var(--lime)]" />
          Alimentação
        </h1>
        <p className="text-sm text-zinc-500">Plano alimentar personalizado</p>
      </div>

      {/* PLANO ALIMENTAR */}
      <div className="space-y-6">
          {!plano ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--lime)]/10 border border-[var(--lime)]/15 flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-[var(--lime)]" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-white">Monte seu plano alimentar</h2>
                  <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                    Plano personalizado baseado no seu corpo e objetivo
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--lime)] text-black px-6 py-3 font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  Começar <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {showForm && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Seus Dados</h3>
                    <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Peso (kg)</label>
                      <input type="number" value={peso} onChange={e => setPeso(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Altura (cm)</label>
                      <input type="number" value={altura} onChange={e => setAltura(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Idade</label>
                      <input type="number" value={idade} onChange={e => setIdade(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60 focus:ring-2 focus:ring-[var(--lime)]/20" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Sexo</label>
                      <select value={sexo} onChange={e => setSexo(e.target.value as "male" | "female")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/60">
                        <option value="male">Masculino</option>
                        <option value="female">Feminino</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Objetivo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["lose_weight", "gain_muscle", "maintain"] as const).map(g => (
                        <button key={g} onClick={() => setObjetivo(g)}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            objetivo === g
                              ? "bg-[var(--lime)]/15 border-[var(--lime)]/30 text-[var(--lime)]"
                              : "bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/15"
                          }`}
                        >{goalLabels[g]}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => genPlan.mutate({ data: { weight: peso, height: altura, age: idade, sex: sexo, goal: objetivo } })}
                    disabled={genPlan.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lime)] text-black px-5 py-3 font-bold text-sm hover:brightness-110 disabled:opacity-40 transition-all"
                  >
                    {genPlan.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando plano...</> : <><Sparkles className="w-4 h-4" /> Gerar Plano Alimentar</>}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[var(--lime)]/15 bg-[var(--lime)]/[0.04] p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--lime)]" />
                  <span className="text-xs font-black text-[var(--lime)] uppercase tracking-widest">{plano.exercise_name}</span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{plano.description}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="text-center">
                    <div className="text-xl font-black text-white">{plano.calories_per_day}</div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Calorias/dia</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black text-[var(--lime)]">{plano.macronutrients.proteins}</div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Proteína</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black text-white">{plano.macronutrients.carbohydrates}</div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Carboidrato</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black text-white">{plano.macronutrients.fats}</div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Gordura</div>
                  </div>
                </div>
              </div>

              {plano.meal_suggestions.map((category, i) => {
                const meta = MEAL_ICONS[category.meal] ?? DEFAULT_MEAL;
                return (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meta.icon}</span>
                      <h3 className="text-sm font-black text-white uppercase tracking-wide">{category.meal}</h3>
                    </div>
                    <div className="space-y-2">
                      {category.suggestions.map((sug, j) => (
                        <div key={j} className={`rounded-2xl border border-white/8 bg-gradient-to-br ${meta.color} p-4 space-y-3`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-bold text-white">{sug.name}</div>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5">
                              <Flame className="w-3 h-3 text-orange-400" />
                              <span className="text-[10px] font-black text-orange-400">{sug.calories} cal</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {sug.ingredients.map((ing, k) => (
                              <span key={k} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/8">{ing}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <button onClick={() => { setPlano(null); setShowForm(false); }}
                className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-3 text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >Gerar novo plano</button>
            </div>
          )}
        </div>
    </div>
  );
}
