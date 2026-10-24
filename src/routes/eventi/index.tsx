import { createFileRoute } from "@tanstack/react-router";
import Eventi from "@/pages/Eventi";

export const Route = createFileRoute("/eventi/")({
  head: () => ({
    meta: [
      { title: "Eventi a Milano e nei quartieri | Milano Help" },
      { name: "description", content: "Scopri eventi, concerti e iniziative nei quartieri di Milano e dintorni sul portale Milano Help." },
      { property: "og:title", content: "Eventi a Milano e nei quartieri | Milano Help" },
      { property: "og:description", content: "Scopri eventi, concerti e iniziative nei quartieri di Milano e dintorni sul portale Milano Help." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.milanohelp.it/eventi" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "https://www.milanohelp.it/eventi" }],
  }),
  component: Eventi,
});
