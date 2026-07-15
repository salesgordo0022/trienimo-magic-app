import { createFileRoute } from "@tanstack/react-router";

const HOST = "exercisedb.p.rapidapi.com";

export const Route = createFileRoute("/api/public/exercise-gif/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8);
        if (!id) return new Response("bad id", { status: 400 });
        const key = process.env.RAPIDAPI_KEY;
        if (!key) return new Response("no key", { status: 500 });
        const r = await fetch(`https://${HOST}/image?exerciseId=${id}&resolution=180`, {
          headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": key },
        });
        if (!r.ok) return new Response("upstream", { status: r.status });
        const buf = await r.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "content-type": r.headers.get("content-type") ?? "image/gif",
            "cache-control": "public, max-age=86400, immutable",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
