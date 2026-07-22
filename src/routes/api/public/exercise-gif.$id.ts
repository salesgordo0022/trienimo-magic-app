import { createFileRoute } from "@tanstack/react-router";

const HOST = "exercisedb.p.rapidapi.com";

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360"><rect width="360" height="360" fill="#0a0a0a"/><g fill="#CCFF00" font-family="system-ui,Arial" text-anchor="middle"><text x="180" y="170" font-size="28" font-weight="900">GIF EM BREVE</text><text x="180" y="205" font-size="14" fill="#888">sincronizando...</text></g></svg>`;

function placeholder(status = 200) {
  return new Response(PLACEHOLDER_SVG, {
    status,
    headers: {
      "content-type": "image/svg+xml",
      // curto para reprovar em breve (quando a cota resetar)
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}

export const Route = createFileRoute("/api/public/exercise-gif/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8);
        if (!id) return placeholder(400);

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
        if (!key) return placeholder();
        let r: Response;
        try {
          r = await fetch(`https://${HOST}/image?exerciseId=${id}&resolution=360`, {
            headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": key },
          });
        } catch {
          return placeholder();
        }
        // Qualquer erro (429 rate-limit, 404, 5xx) → placeholder amigável
        if (!r.ok) return placeholder();
        const buf = await r.arrayBuffer();
        const contentType = r.headers.get("content-type") ?? "image/gif";
        // Sanidade: alguns 200 vem com JSON de erro. Verifica tipo.
        if (!contentType.startsWith("image/")) return placeholder();
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

