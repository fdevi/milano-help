import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* AGGIUNTO pt-20 per spaziare dalla navbar */}
      <div className="container mx-auto max-w-4xl px-4 pt-20 pb-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-6 -ml-2 gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Indietro
        </Button>

        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
          Termini e Condizioni
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
        </p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              1. Accettazione dei termini
            </h2>
            <p className="text-muted-foreground">
              Utilizzando la piattaforma Milano Help ("il Servizio"), accetti di essere vincolato dai presenti Termini e Condizioni. Se non accetti questi termini, non puoi utilizzare il Servizio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              2. Descrizione del Servizio
            </h2>
            <p className="text-muted-foreground">
              Milano Help è una piattaforma community che consente agli utenti di:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Pubblicare e visualizzare annunci di servizi</li>
              <li>Creare e partecipare a eventi locali</li>
              <li>Unirsi a gruppi di discussione</li>
              <li>Interagire con altri utenti tramite chat</li>
              <li>Condividere informazioni e risorse nel proprio quartiere</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              3. Requisiti di registrazione
            </h2>
            <p className="text-muted-foreground">
              Per utilizzare il Servizio, devi:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Avere almeno 18 anni</li>
              <li>Fornire informazioni accurate e complete</li>
              <li>Mantenere la riservatezza del tuo account</li>
              <li>Essere residente nell'area di Milano, provincia o Monza Brianza</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              4. Condotta dell'utente
            </h2>
            <p className="text-muted-foreground mb-2">
              Accetti di non:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Pubblicare contenuti illegali, offensivi o diffamatori</li>
              <li>Violare i diritti di proprietà intellettuale</li>
              <li>Utilizzare il Servizio per attività fraudolente</li>
              <li>Molestare altri utenti</li>
              <li>Pubblicare annunci duplicati o ingannevoli</li>
              <li>Utilizzare bot o script automatizzati</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              5. Moderazione dei contenuti
            </h2>
            <p className="text-muted-foreground">
              Tutti i contenuti pubblicati vengono moderati prima della pubblicazione. Ci riserviamo il diritto di rimuovere qualsiasi contenuto che violi questi termini, senza preavviso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              6. Proprietà intellettuale
            </h2>
            <p className="text-muted-foreground">
              Mantieni la proprietà dei contenuti che pubblichi. Concedi a Milano Help una licenza non esclusiva per utilizzare, visualizzare e distribuire tali contenuti all'interno della piattaforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              7. Limitazione di responsabilità
            </h2>
            <p className="text-muted-foreground">
              Milano Help non è responsabile per le interazioni tra utenti, per l'accuratezza degli annunci o per eventuali danni derivanti dall'uso del Servizio. La piattaforma è fornita "così com'è".
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              8. Sospensione e cessazione
            </h2>
            <p className="text-muted-foreground">
              Possiamo sospendere o terminare il tuo accesso al Servizio in qualsiasi momento, per qualsiasi motivo, incluso il mancato rispetto di questi termini.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              9. Modifiche ai termini
            </h2>
            <p className="text-muted-foreground">
              Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. Le modifiche saranno efficaci dopo la pubblicazione sulla piattaforma. L'uso continuato del Servizio costituisce accettazione delle modifiche.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              10. Contatti
            </h2>
            <p className="text-muted-foreground">
              Per domande sui presenti termini, contattaci a:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: <a href="mailto:legal@milanohelp.it" className="text-primary hover:underline">legal@milanohelp.it</a>
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Terms;