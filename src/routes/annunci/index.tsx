import { createFileRoute } from "@tanstack/react-router";
import AnnunciPubblici from "@/pages/AnnunciPubblici";
import { directoryPage, directoryUrl } from "@/lib/announcementSeo";

export const Route = createFileRoute("/annunci/")({
  validateSearch: (search: Record<string, unknown>): { pagina?: number } => {
    const page = directoryPage(search["pagina"] != null ? String(search["pagina"]) : null);
    return page > 1 ? { pagina: page } : {};
  },
  loaderDeps: ({ search }) => ({ pagina: search.pagina }),
  loader: ({ deps }) => ({ page: deps.pagina ?? 1 }),
  head: ({ loaderData }) => {
    const page = loaderData?.page ?? 1;
    const title = `Annunci a Milano${page > 1 ? ` — Pagina ${page}` : ""} | Milano Help`;
    const description = "Scopri gli annunci pubblicati su Milano Help: oggetti, professionisti e negozi nei quartieri di Milano.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index,follow" },
        { property: "og:title", content: "Annunci a Milano | Milano Help" },
        { property: "og:description", content: description },
        { property: "og:url", content: directoryUrl(page) },
      ],
      links: [{ rel: "canonical", href: directoryUrl(page) }],
    };
  },
  component: AnnunciPubblici,
});
