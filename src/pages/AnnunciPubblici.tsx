import { Link, useSearchParams } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { MapPin, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ANNOUNCEMENTS_PAGE_SIZE, directoryPage, directoryUrl } from "@/lib/announcementSeo";

export default function AnnunciPubblici() {
  const [params] = useSearchParams();
  const page = directoryPage(params.get("pagina"));
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["annunci-pubblici", page],
    queryFn: async () => {
      const from = (page - 1) * ANNOUNCEMENTS_PAGE_SIZE;
      const { data, error, count } = await supabase.from("annunci")
        .select("id, titolo, prezzo, immagini, quartiere", { count: "exact" })
        .eq("stato", "attivo").order("created_at", { ascending: false }).order("id")
        .range(from, from + ANNOUNCEMENTS_PAGE_SIZE - 1);
      if (error?.code === "PGRST103") {
        const { count: total, error: countError } = await supabase.from("annunci").select("id", { count: "exact", head: true }).eq("stato", "attivo");
        if (countError) throw countError;
        return { items: [], count: total || 0 };
      }
      if (error) throw error;
      return { items: data || [], count: count || 0 };
    },
  });
  const totalPages = Math.max(1, Math.ceil((data?.count || 0) / ANNOUNCEMENTS_PAGE_SIZE));
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`Annunci a Milano${page > 1 ? ` — Pagina ${page}` : ""} | Milano Help`}</title>
        <meta name="description" content="Scopri gli annunci pubblicati su Milano Help: oggetti, professionisti e negozi nei quartieri di Milano." />
        <meta name="robots" content={!isLoading && (isError || page > totalPages) ? "noindex,follow" : "index,follow"} />
        <link rel="canonical" href={directoryUrl(page)} />
        <meta property="og:url" content={directoryUrl(page)} />
        <meta property="og:title" content="Annunci a Milano | Milano Help" />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 pt-24 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Annunci a Milano</h1>
          <Button asChild><Link to="/nuovo-annuncio">Pubblica un annuncio</Link></Button>
        </div>
        {isLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[4/3]" />)}</div>
          : isError ? <div className="py-12 text-center space-y-4"><p>Impossibile caricare gli annunci.</p><Button onClick={() => refetch()}>Riprova</Button></div>
          : data?.items.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.items.map(item => <Link key={item.id} to={`/annuncio/${item.id}`}>
              <Card className="overflow-hidden h-full hover:shadow-card-hover transition-shadow">
                <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                  {item.immagini?.[0] ? <img src={item.immagini[0]} alt={item.titolo} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon className="w-10 h-10 text-muted-foreground" />}
                </div>
                <div className="p-4 space-y-2">
                  <h2 className="font-heading font-bold text-foreground line-clamp-2">{item.titolo}</h2>
                  {item.prezzo != null && <p className="font-bold text-primary">{item.prezzo === 0 ? "Gratis" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(item.prezzo)}</p>}
                  {item.quartiere && <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="w-4 h-4 shrink-0" />{item.quartiere}</p>}
                </div>
              </Card>
            </Link>)}
          </div> : <p className="py-12 text-center text-muted-foreground">Nessun annuncio trovato.</p>}
        {!isLoading && !isError && <nav aria-label="Pagine degli annunci" className="flex items-center justify-center flex-wrap gap-4 mt-8">
          {page > 1 && <Button variant="outline" asChild><Link to={page === 2 ? "/annunci" : `/annunci?pagina=${page - 1}`}><ChevronLeft className="w-4 h-4 mr-1" />Precedente</Link></Button>}
          <span className="text-sm text-muted-foreground">Pagina {page} di {totalPages}</span>
          {page < totalPages && <Button variant="outline" asChild><Link to={`/annunci?pagina=${page + 1}`}>Successiva<ChevronRight className="w-4 h-4 ml-1" /></Link></Button>}
        </nav>}
      </main>
      <Footer />
    </div>
  );
}