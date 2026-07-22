import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const HOST = "ai-workout-planner-exercise-fitness-nutrition-guide.p.rapidapi.com";
const BASE = `https://${HOST}`;

function headers() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY nao configurada");
  return {
    "Content-Type": "application/json",
    "x-rapidapi-host": HOST,
    "x-rapidapi-key": key,
  } as Record<string, string>;
}

export type FoodItem = {
  name: string;
  portion_size: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
};

export type FoodPlateResult = {
  foods_identified: FoodItem[];
  total_nutrition: {
    total_calories: string;
    total_protein: string;
    total_carbs: string;
    total_fats: string;
    fiber: string;
    vitamins_minerals: string[];
    vitamins_minerais: string[];
  };
  meal_analysis: {
    meal_type: string;
    balance_score: string;
    protein_ratio: string;
    carb_ratio: string;
    fat_ratio: string;
  };
  health_insights: {
    meal_balance: string;
    positive_aspects: string[];
    improvement_areas: string[];
    suggestions: string[];
  };
  dietary_flags: {
    is_vegetarian: boolean;
    is_vegano: boolean;
    is_vegetariano: boolean;
    is_gluten_free: boolean;
    is_dairy_free: boolean;
    allergens: string[];
  };
};

export type MealSuggestion = {
  name: string;
  ingredients: string[];
  calories: number;
};

export type MealCategory = {
  meal: string;
  suggestions: MealSuggestion[];
};

export type MealPlanResult = {
  exercise_name: string;
  description: string;
  goal: string;
  calories_per_day: number;
  macronutrients: {
    carbohydrates: string;
    proteins: string;
    fats: string;
  };
  meal_suggestions: MealCategory[];
};

export type NutritionAdviceInput = {
  weight: number;
  height: number;
  age: number;
  sex: "male" | "female";
  goal: "lose_weight" | "gain_muscle" | "maintain";
};

export const analyzeFoodPlate = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { imageUrl: string; lang?: string }) =>
      z
        .object({
          imageUrl: z.string().url("URL da imagem invalida"),
          lang: z.string().max(5).optional(),
        })
        .parse(d)
  )
  .handler(async ({ data }) => {
    const lang = data.lang ?? "pt";
    const params = new URLSearchParams({
      imageUrl: data.imageUrl,
      lang,
      noqueue: "1",
    });
    const url = `${BASE}/analyzeFoodPlate?${params.toString()}`;
    const r = await fetch(url, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ image: "" }),
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`FoodPlate API ${r.status}: ${text}`);
    }
    const json = (await r.json()) as Record<string, unknown>;
    const result = (json.result ?? json) as Record<string, unknown>;
    return result as unknown as FoodPlateResult;
  });

export const generateNutritionPlan = createServerFn({ method: "POST" })
  .inputValidator(
    (d: NutritionAdviceInput) =>
      z
        .object({
          weight: z.number().min(30).max(300),
          height: z.number().min(100).max(250),
          age: z.number().min(14).max(100),
          sex: z.enum(["male", "female"]),
          goal: z.enum(["lose_weight", "gain_muscle", "maintain"]),
        })
        .parse(d)
  )
  .handler(async ({ data }) => {
    const body: Record<string, unknown> = {
      weight: data.weight,
      height: data.height,
      age: data.age,
      sex: data.sex,
      goal: data.goal,
      lang: "pt",
      noqueue: 1,
    };
    const url = `${BASE}/nutritionAdvice`;
    const r = await fetch(url, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`NutritionAdvice API ${r.status}: ${text}`);
    }
    const json = (await r.json()) as Record<string, unknown>;
    const result = (json.result ?? json) as Record<string, unknown>;
    const macros = (result.macronutrients ?? {}) as Record<string, string>;
    const meals = (result.meal_suggestions ?? []) as MealCategory[];
    return {
      exercise_name: (result.exercise_name as string) ?? "Plano Alimentar",
      description: (result.description as string) ?? "",
      goal: (result.goal as string) ?? data.goal,
      calories_per_day: (result.calories_per_day as number) ?? 0,
      macronutrients: {
        carbohydrates: macros.carbohydrates ?? "0%",
        proteins: macros.proteins ?? "0%",
        fats: macros.fats ?? "0%",
      },
      meal_suggestions: meals,
    } as MealPlanResult;
  });
