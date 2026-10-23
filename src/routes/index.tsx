import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { SITE_URL } from "@/lib/announcementSeo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { name: "robots", content: "index,follow" },
      { property: "og:url", content: `${SITE_URL}/` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: Index,
});
