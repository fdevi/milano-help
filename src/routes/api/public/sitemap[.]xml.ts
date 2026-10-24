import { createFileRoute } from "@tanstack/react-router";

// Public XML only: proxy the existing live sitemap under the verified site domain.
export const Route = createFileRoute("/api/public/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env["SUPABASE_URL"];
        if (!url) return new Response("Sitemap unavailable", { status: 503 });
        const response = await fetch(`${url}/functions/v1/sitemap`);
        if (!response.ok) return new Response("Sitemap unavailable", { status: 503 });
        return new Response(await response.text(), {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
        });
      },
    },
  },
});