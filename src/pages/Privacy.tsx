import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Privacy = () => {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
        </p>

        {/* ... resto del contenuto (invariato) ... */}
        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              1. Introduzione
            </h2>
            <p className="text-muted-foreground">
              La presente Privacy Policy descrive come Milano Help ("noi", "nostro") raccoglie, utilizza e condivide le informazioni personali degli utenti ("tu", "tuo") che utilizzano la nostra piattaforma e i nostri servizi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              2. Dati che raccogliamo
            </h2>
            <p className="text-muted-foreground mb-2">
              Raccogliamo le seguenti informazioni:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Informazioni di registrazione (nome, email, telefono)</li>
              <li>Dati di profilo (foto, quartiere, preferenze)</li>
              <li>Contenuti pubblicati (annunci, eventi, commenti)</li>
              <li>Dati di utilizzo della piattaforma</li>
              <li>Informazioni di geolocalizzazione (se fornite)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              3. Come utilizziamo i tuoi dati
            </h2>
            <p className="text-muted-foreground mb-2">
              Utilizziamo i tuoi dati per:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Fornire e gestire i nostri servizi</li>
              <li>Personalizzare la tua esperienza sulla piattaforma</li>
              <li>Comunicare con te (notifiche, aggiornamenti)</li>
              <li>Migliorare e ottimizzare la piattaforma</li>
              <li>Garantire la sicurezza e prevenire frodi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              4. Condivisione dei dati
            </h2>
            <p className="text-muted-foreground">
              Non vendiamo i tuoi dati personali. Possiamo condividere informazioni con:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Altri utenti (secondo le tue impostazioni privacy)</li>
              <li>Fornitori di servizi tecnici (hosting, analisi)</li>
              <li>Autorità pubbliche se richiesto dalla legge</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              5. I tuoi diritti
            </h2>
            <p className="text-muted-foreground mb-2">
              Hai il diritto di:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Accedere ai tuoi dati personali</li>
              <li>Richiedere la rettifica o cancellazione</li>
              <li>Opporti al trattamento</li>
              <li>Richiedere la portabilità dei dati</li>
              <li>Revocare il consenso in qualsiasi momento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              6. Sicurezza
            </h2>
            <p className="text-muted-foreground">
              Adottiamo misure di sicurezza tecniche e organizzative per proteggere i tuoi dati da accessi non autorizzati, perdita o distruzione.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              7. Contatti
            </h2>
            <p className="text-muted-foreground">
              Per qualsiasi domanda relativa alla privacy, puoi contattarci a:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: <a href="mailto:privacy@milanohelp.it" className="text-primary hover:underline">privacy@milanohelp.it</a>
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Privacy;