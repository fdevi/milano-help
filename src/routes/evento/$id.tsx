import { createFileRoute } from "@tanstack/react-router";
import EventoPage from "@/pages/EventoPage";
import { getPublicEvent } from "@/lib/publicEvent.functions";
import { eventHeadData } from "@/lib/eventSeo";

export const Route = createFileRoute("/evento/$id")({
  loader: async ({ params }) => {
    try {
      return { event: await getPublicEvent({ data: { id: params.id } }) };
    } catch {
      // Share-preview failures must not block the page's independent event lookup.
      return { event: null };
    }
  },
  errorComponent: EventoPage,
  notFoundComponent: EventoPage,
  head: ({ params, loaderData }) => {
    const seo = eventHeadData(params.id, loaderData?.event ?? null);
    const meta: Array<Record<string, string>> = [
      { title: seo.title },
      { name: "description", content: seo.description },
      { name: "robots", content: seo.robots },
      { property: "og:site_name", content: "Milano Help" },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: seo.url },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "it_IT" },
      { name: "twitter:card", content: seo.image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: seo.title },
      { name: "twitter:description", content: seo.description },
    ];
    if (seo.image) meta.push({ property: "og:image", content: seo.image }, { name: "twitter:image", content: seo.image });
    return { meta, links: [{ rel: "canonical", href: seo.url }] };
  },
  component: EventoPage,
});
