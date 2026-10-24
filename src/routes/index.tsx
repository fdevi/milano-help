import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { SITE_URL } from "@/lib/announcementSeo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Milano Help | La community del tuo quartiere" },
      { name: "description", content: "Scopri annunci, prossimi eventi, gruppi e servizi nei quartieri di Milano, provincia e Monza Brianza con Milano Help." },
      { property: "og:title", content: "Milano Help | La community del tuo quartiere" },
      { property: "og:description", content: "Scopri annunci, prossimi eventi, gruppi e servizi nei quartieri di Milano, provincia e Monza Brianza con Milano Help." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index,follow" },
      { property: "og:url", content: `${SITE_URL}/` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: Index,
});
