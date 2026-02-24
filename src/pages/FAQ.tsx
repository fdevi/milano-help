import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Mail, Users, Heart, Shield, FileText, CreditCard } from "lucide-react";

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-heading font-bold text-3xl mb-2">Domande Frequenti</h1>
            <p className="text-muted-foreground">
              Trova le risposte alle domande più comuni su Milano Help.
            </p>
          </div>

          <Card className="p-6 shadow-card">
            <Accordion type="single" collapsible className="w-full">
              {/* Sezione: Account e Registrazione */}
              <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Account e Registrazione
              </h2>
              <AccordionItem value="item-1">
                <AccordionTrigger>Come mi registro su Milano Help?</AccordionTrigger>
                <AccordionContent>
                  Puoi registrarti cliccando su "Registrati" in alto a destra. Puoi usare la tua email o accedere con Google. Dopo la registrazione riceverai un'email di conferma per attivare il tuo account.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Ho dimenticato la password, come faccio?</AccordionTrigger>
                <AccordionContent>
                  Nella pagina di login clicca su "Password dimenticata?" e segui le istruzioni per reimpostarla. Riceverai un'email con il link per creare una nuova password.
                </AccordionContent>
              </AccordionItem>

              {/* Sezione: Annunci ed Eventi */}
              <h2 className="font-semibold text-lg mt-6 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Annunci ed Eventi
              </h2>
              <AccordionItem value="item-3">
                <AccordionTrigger>Come posso pubblicare un annuncio?</AccordionTrigger>
                <AccordionContent>
                  Dopo aver effettuato l'accesso, vai su "Pubblica" nella sidebar o nel menu. Scegli la categoria (Offro servizio, Cerca, In vendita, ecc.), compila i campi richiesti e invia l'annuncio. Verrà moderato prima della pubblicazione.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Quanto tempo ci vuole per la moderazione?</AccordionTrigger>
                <AccordionContent>
                  La moderazione viene effettuata dal nostro team nel più breve tempo possibile, di solito entro 24 ore. Riceverai una notifica quando l'annuncio sarà approvato.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger>Posso modificare o eliminare un annuncio?</AccordionTrigger>
                <AccordionContent>
                  Sì, dalla sezione "I miei annunci" puoi modificare o eliminare i tuoi annunci in qualsiasi momento. Se modifichi un annuncio già approvato, potrebbe essere necessario passare nuovamente in moderazione.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-6">
                <AccordionTrigger>Come funzionano gli eventi?</AccordionTrigger>
                <AccordionContent>
                  Puoi creare eventi dalla sezione "Pubblica" selezionando la categoria "Evento". Inserisci titolo, descrizione, data, luogo e altre informazioni. Gli eventi vengono moderati e, una volta approvati, appaiono nella sezione "Eventi" e nella home page.
                </AccordionContent>
              </AccordionItem>

              {/* Sezione: Gruppi e Chat */}
              <h2 className="font-semibold text-lg mt-6 mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Gruppi e Chat
              </h2>
              <AccordionItem value="item-7">
                <AccordionTrigger>Come posso creare un gruppo?</AccordionTrigger>
                <AccordionContent>
                  Vai su "Gruppi" nella sidebar e clicca su "Crea gruppo". Scegli nome, descrizione, immagine e tipo (pubblico o privato). Una volta creato, diventi automaticamente amministratore del gruppo.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-8">
                <AccordionTrigger>Come mi unisco a un gruppo?</AccordionTrigger>
                <AccordionContent>
                  Nella pagina dei gruppi, clicca sul gruppo che ti interessa e poi su "Unisciti". Se il gruppo è pubblico entrerai subito, se è privato dovrai attendere l'approvazione dell'amministratore.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-9">
                <AccordionTrigger>Come funzionano le chat di gruppo?</AccordionTrigger>
                <AccordionContent>
                  Una volta entrato in un gruppo, puoi partecipare alla chat pubblica del gruppo. Riceverai notifiche in tempo reale per i nuovi messaggi. Puoi anche avviare chat private con altri utenti dalla pagina degli annunci.
                </AccordionContent>
              </AccordionItem>

              {/* Sezione: Donazioni */}
              <h2 className="font-semibold text-lg mt-6 mb-2 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" /> Donazioni
              </h2>
              <AccordionItem value="item-10">
                <AccordionTrigger>Come posso sostenere Milano Help?</AccordionTrigger>
                <AccordionContent>
                  Puoi effettuare una donazione tramite PayPal o carta di credito visitando la pagina "Donazioni" nella sidebar. Scegli l'importo che preferisci e completa il pagamento in modo sicuro. Il tuo contributo ci aiuta a mantenere attiva la piattaforma.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-11">
                <AccordionTrigger>Le donazioni sono sicure?</AccordionTrigger>
                <AccordionContent>
                  Sì, tutte le transazioni sono gestite da PayPal, che garantisce la massima sicurezza per i pagamenti online. Non memorizziamo dati sensibili delle carte di credito.
                </AccordionContent>
              </AccordionItem>

              {/* Sezione: Privacy e Sicurezza */}
              <h2 className="font-semibold text-lg mt-6 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Privacy e Sicurezza
              </h2>
              <AccordionItem value="item-12">
                <AccordionTrigger>Come vengono gestiti i miei dati?</AccordionTrigger>
                <AccordionContent>
                  I tuoi dati sono trattati nel rispetto della privacy. Puoi consultare la nostra <a href="/privacy" className="text-primary underline">Privacy Policy</a> per maggiori dettagli. Puoi sempre modificare le tue preferenze di visibilità nel tuo profilo.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-13">
                <AccordionTrigger>Posso rendere il mio profilo privato?</AccordionTrigger>
                <AccordionContent>
                  Sì, nel tuo profilo puoi impostare le preferenze di privacy: puoi rendere il profilo pubblico o privato, e decidere se mostrare email e telefono.
                </AccordionContent>
              </AccordionItem>

              {/* Sezione: Contatti e Supporto */}
              <h2 className="font-semibold text-lg mt-6 mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" /> Contatti e Supporto
              </h2>
              <AccordionItem value="item-14">
                <AccordionTrigger>Come posso contattare lo staff?</AccordionTrigger>
                <AccordionContent>
                  Puoi utilizzare il form nella pagina <a href="/contattaci" className="text-primary underline">Contattaci</a>. Ti risponderemo al più presto via email.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-15">
                <AccordionTrigger>Come posso segnalare un problema?</AccordionTrigger>
                <AccordionContent>
                  Se riscontri problemi tecnici o vuoi segnalare un contenuto inappropriato, contattaci tramite il form o all'indirizzo email dello staff.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FAQ;