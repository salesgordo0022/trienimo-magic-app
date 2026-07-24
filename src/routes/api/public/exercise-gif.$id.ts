import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/exercise-gif/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8);
        if (!id) return new Response("bad id", { status: 400 });

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

        return new Response("not found", { status: 404 });
      },
    },
  },
});
