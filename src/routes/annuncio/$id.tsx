import { createFileRoute } from "@tanstack/react-router";
import AnnuncioPage from "@/pages/AnnuncioPage";
import { supabase } from "@/integrations/supabase/client";
import { announcementHeadData } from "@/lib/announcementSeo";

export const Route = createFileRoute("/annuncio/$id")({
  loader: async ({ params }) => {
    try {
      const { data } = await supabase
        .from("annunci")
        .select("titolo, descrizione, quartiere, stato, immagini")
        .eq("id", params.id)
        .maybeSingle();
      return { announcement: data ?? null };
    } catch {
      return { announcement: null };
    }
  },
  head: ({ params, loaderData }) => {
    const seo = announcementHeadData(params.id, loaderData?.announcement ?? null);
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
    if (seo.image) {
      meta.push({ property: "og:image", content: seo.image }, { name: "twitter:image", content: seo.image });
    }
    return { meta, links: [{ rel: "canonical", href: seo.url }] };
  },
  component: AnnuncioPage,
});
