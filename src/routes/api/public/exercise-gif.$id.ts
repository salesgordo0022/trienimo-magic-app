import { createFileRoute } from "@tanstack/react-router";

const HOST = "exercisedb.p.rapidapi.com";

export const Route = createFileRoute("/api/public/exercise-gif/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8);
        if (!id) return new Response("bad id", { status: 400 });

        // 1) tenta servir do storage (fonte permanente)
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const dl = await supabaseAdmin.storage.from("exercise-gifs").download(`${id}.gif`);
          if (dl.data) {
            const buf = await dl.data.arrayBuffer();
            return new Response(buf, {
              status: 200,
              headers: {
                "content-type": dl.data.type || "image/gif",
                "cache-control": "public, max-age=31536000, immutable",
                "access-control-allow-origin": "*",
              },
            });
          }
        } catch {
          // segue para fallback
        }

        // 2) fallback: baixa da API e salva no storage (self-heal)
        const key = process.env.RAPIDAPI_KEY;
        if (!key) return new Response("not synced", { status: 404 });
        const r = await fetch(`https://${HOST}/image?exerciseId=${id}&resolution=360`, {
          headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": key },
        });
        if (!r.ok) return new Response("upstream", { status: r.status });
        const buf = await r.arrayBuffer();
        const contentType = r.headers.get("content-type") ?? "image/gif";
        // salva no storage e marca no banco para próximas requisições
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const path = `${id}.gif`;
          await supabaseAdmin.storage.from("exercise-gifs").upload(path, new Uint8Array(buf), {
            contentType, upsert: true,
          });
          await supabaseAdmin.from("exercises_catalog").update({ gif_path: path }).eq("id", id);
        } catch {}
        return new Response(buf, {
          status: 200,
          headers: {
            "content-type": contentType,
            "cache-control": "public, max-age=31536000, immutable",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
