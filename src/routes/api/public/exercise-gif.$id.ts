import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/exercise-gif/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8);
        if (!id) return new Response("bad id", { status: 400 });

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
          return new Response(buf, {
            status: 200,
            headers: {
              "content-type": "image/gif",
              "cache-control": "public, max-age=31536000, immutable",
              "access-control-allow-origin": "*",
            },
          });
        } catch {
          return new Response("not found", { status: 404 });
        }
      },
    },
  },
});
