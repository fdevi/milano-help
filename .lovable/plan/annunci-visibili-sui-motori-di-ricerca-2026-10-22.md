# Annunci visibili sui motori di ricerca

- Rendere ogni annuncio attivo riconoscibile da Google e Bing con titolo, descrizione e indirizzo univoci; escludere annunci in moderazione, rifiutati o rimossi.
- Aggiungere un elenco pubblico degli annunci, con pagine e collegamenti che consentono ai motori di scoprire anche le nuove pubblicazioni senza effettuare l'accesso.
- Generare una mappa del sito con gli annunci attivi a ogni pubblicazione del sito e aggiornare le informazioni generali di Milano Help.
- Verificare l'accesso senza login, l'esclusione degli annunci non attivi e i collegamenti dell'elenco pubblico.

## Dettagli tecnici

Usare react-helmet-async per i metadati delle pagine, un generatore di sitemap prima della compilazione e un elenco pubblico paginato. Correggere la policy di lettura che attualmente consente anche l'accesso anonimo agli annunci non attivi, preservando l'accesso di proprietari e amministrazione.

## Limiti

Le modifiche al sito pubblico richiedono una nuova pubblicazione. L'indicizzazione e i tempi dipendono dai motori di ricerca: non è possibile garantire che ogni annuncio compaia nei risultati. I motori che non eseguono JavaScript non vedranno il contenuto completo delle singole pagine con l'attuale versione del sito.