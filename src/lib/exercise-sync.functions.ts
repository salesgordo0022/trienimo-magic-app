import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HOST = "exercisedb.p.rapidapi.com";
const BASE = `https://${HOST}`;

type RawExercise = {
  id: string;
  name: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  gifUrl?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  difficulty?: string;
};

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Apenas admin pode sincronizar exercícios");
}

// Progresso da sincronização
export const getSyncProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const total = await supabaseAdmin
      .from("exercises_catalog")
      .select("*", { count: "exact", head: true });
    const withGif = await supabaseAdmin
      .from("exercises_catalog")
      .select("*", { count: "exact", head: true })
      .not("gif_path", "is", null);
    return {
      total: total.count ?? 0,
      withGif: withGif.count ?? 0,
      pending: (total.count ?? 0) - (withGif.count ?? 0),
    };
  });

// Fase 1: importa metadados de todos os exercícios da API (sem GIFs) e já traduz para pt-BR
export const importExerciseMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const key = process.env.RAPIDAPI_KEY;
    if (!key) throw new Error("RAPIDAPI_KEY não configurada");
    const r = await fetch(`${BASE}/exercises?limit=1500&offset=0`, {
      headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": key },
    });
    if (!r.ok) throw new Error(`ExerciseDB ${r.status}`);
    const items = (await r.json()) as RawExercise[];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = items.map((e) => ({
      id: String(e.id),
      name: e.name ?? "",
      body_part: e.bodyPart ?? null,
      target: e.target ?? null,
      equipment: e.equipment ?? null,
      difficulty: e.difficulty ?? null,
      secondary_muscles: e.secondaryMuscles ?? null,
      instructions: e.instructions ?? null,
    }));
    // upsert em lotes de 500 para caber no PostgREST
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabaseAdmin
        .from("exercises_catalog")
        .upsert(chunk, { onConflict: "id", ignoreDuplicates: false });
      if (error) throw new Error(error.message);
    }
    // Traduzir automaticamente todos os exercícios em segundo plano
    // (ignora erros para não bloquear a importação)
    const { translateEN } = await import("./exercisedb.functions");
    const { data: toTranslate } = await supabaseAdmin
      .from("exercises_catalog")
      .select("id, name, instructions")
      .is("name_pt", null);
    if (toTranslate?.length) {
      let translatedCount = 0;
      for (const ex of toTranslate) {
        try {
          const ptName = await translateEN(ex.name);
          if (ptName !== ex.name) {
            const upd: any = { name_pt: ptName };
            if (ex.instructions?.length) {
              upd.instructions_pt = await Promise.all(
                (ex.instructions as string[]).map((s: string) => translateEN(s)),
              );
            }
            await supabaseAdmin.from("exercises_catalog").update(upd).eq("id", ex.id);
            translatedCount++;
          }
          await new Promise((r) => setTimeout(r, 500));
        } catch {
          // continua com o próximo
        }
      }
    }
    return { imported: rows.length };
  });

// Fase 2: baixa GIFs em lote (chame repetidamente até `pending = 0`)
export const importGifsBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { batchSize?: number }) =>
    z.object({ batchSize: z.number().int().min(1).max(20).optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const key = process.env.RAPIDAPI_KEY;
    if (!key) throw new Error("RAPIDAPI_KEY não configurada");
    const size = data.batchSize ?? 8;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pending, error } = await supabaseAdmin
      .from("exercises_catalog")
      .select("id")
      .is("gif_path", null)
      .order("id", { ascending: true })
      .limit(size);
    if (error) throw new Error(error.message);
    if (!pending?.length) return { processed: 0, failed: 0, done: true };

    let processed = 0;
    let failed = 0;
    for (const row of pending) {
      try {
        const rid = String(row.id).replace(/[^0-9a-zA-Z]/g, "").slice(0, 8);
        if (!rid) { failed++; continue; }
        const gr = await fetch(`${BASE}/image?exerciseId=${rid}&resolution=360`, {
          headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": key },
        });
        if (!gr.ok) { failed++; continue; }
        const buf = new Uint8Array(await gr.arrayBuffer());
        const path = `${rid}.gif`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("exercise-gifs")
          .upload(path, buf, {
            contentType: gr.headers.get("content-type") ?? "image/gif",
            upsert: true,
          });
        if (upErr) { failed++; continue; }
        const { error: updErr } = await supabaseAdmin
          .from("exercises_catalog")
          .update({ gif_path: path, synced_at: new Date().toISOString() })
          .eq("id", row.id);
        if (updErr) { failed++; continue; }
        processed++;
      } catch {
        failed++;
      }
    }

    const remaining = await supabaseAdmin
      .from("exercises_catalog")
      .select("*", { count: "exact", head: true })
      .is("gif_path", null);
    return {
      processed,
      failed,
      done: (remaining.count ?? 0) === 0,
      pending: remaining.count ?? 0,
    };
  });

// Traduz um lote de exercícios via MyMemory e salva em name_pt / instructions_pt
export const batchTranslateExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { batchSize?: number }) =>
    z.object({ batchSize: z.number().int().min(1).max(30).optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const size = data.batchSize ?? 10;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pending, error } = await supabaseAdmin
      .from("exercises_catalog")
      .select("id, name, instructions")
      .is("name_pt", null)
      .order("id", { ascending: true })
      .limit(size);
    if (error) throw new Error(error.message);
    if (!pending?.length) return { processed: 0, done: true, pending: 0 };

    const { translateEN } = await import("./exercisedb.functions");
    let processed = 0;
    for (const row of pending) {
      try {
        const ptName = await translateEN(row.name);
        let ptInstructions: string[] | null = null;
        if (row.instructions?.length) {
          ptInstructions = await Promise.all(row.instructions.map((s: string) => translateEN(s)));
        }
        const upd: any = { name_pt: ptName };
        if (ptInstructions) upd.instructions_pt = ptInstructions;
        const { error: updErr } = await supabaseAdmin
          .from("exercises_catalog")
          .update(upd)
          .eq("id", row.id);
        if (!updErr) processed++;
        await new Promise((r) => setTimeout(r, 600));
      } catch {
        // skip failed
      }
    }

    const remaining = await supabaseAdmin
      .from("exercises_catalog")
      .select("*", { count: "exact", head: true })
      .is("name_pt", null);
    return {
      processed,
      done: (remaining.count ?? 0) === 0,
      pending: remaining.count ?? 0,
    };
  });
