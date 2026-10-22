import { Helmet } from "react-helmet-async";
import { announcementDescription, announcementUrl, isIndexableAnnouncement } from "@/lib/announcementSeo";

interface Props {
  id?: string;
  announcement?: { titolo: string; descrizione: string | null; quartiere: string | null; stato: string } | null;
  loading?: boolean;
}

export default function AnnouncementHead({ id, announcement, loading }: Props) {
  const active = isIndexableAnnouncement(announcement?.stato);
  const title = active && announcement ? `${announcement.titolo} | Milano Help` : loading ? "Annuncio | Milano Help" : "Annuncio non disponibile | Milano Help";
  const description = active && announcement ? announcementDescription(announcement.descrizione, announcement.titolo, announcement.quartiere) : "Annunci della community di Milano Help.";
  const url = announcementUrl(id || "");
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={active || loading ? "index,follow" : "noindex,follow"} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}