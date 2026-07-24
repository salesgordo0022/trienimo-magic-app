import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/exercise-gif/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8);
        if (!id) return new Response("bad id", { status: 400 });

        // 1. Tenta servir do banco (base64)
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: row } = await supabaseAdmin
            .from("exercises_catalog")
            .select("gif_data")
            .eq("id", id)
            .maybeSingle();

          if (row?.gif_data) {
            const buf = Buffer.from(row.gif_data, "base64");
            return new Response(buf, {
              status: 200,
              headers: {
                "content-type": "image/gif",
                "cache-control": "public, max-age=31536000, immutable",
                "access-control-allow-origin": "*",
              },
            });
          }
        } catch {}

        // 2. Fallback: busca da RapidAPI e salva no banco pra próxima vez
        try {
          const key = process.env.RAPIDAPI_KEY;
          if (!key) return new Response("not found", { status: 404 });

          const gr = await fetch(
            `https://exercisedb.p.rapidapi.com/image?exerciseId=${id}&resolution=360`,
            {
              headers: {
                "x-rapidapi-host": "exercisedb.p.rapidapi.com",
                "x-rapidapi-key": key,
              },
            },
          );
          if (!gr.ok) return new Response("not found", { status: 404 });

          const buf = await gr.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");

          // Salva no banco pra próxima vez (fire and forget)
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin
              .from("exercises_catalog")
              .update({ gif_data: b64 })
              .eq("id", id);
          } catch {}

          return new Response(buf, {
            status: 200,
            headers: {
              "content-type": "image/gif",
              "cache-control": "public, max-age=31536000, immutable",
              "access-control-allow-origin": "*",
            },
          });
        } catch {}

        return new Response("not found", { status: 404 });
      },
    },
  },
});
