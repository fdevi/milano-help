# Rinnovo del token Meta (Facebook + Instagram)

Il sito pubblica gli eventi usando il segreto **META_ACCESS_TOKEN** (token utente di lunga durata).
Dal token utente il sito ricava da solo il token della Pagina a ogni pubblicazione.
Il token dura circa 60 giorni: 7 giorni prima della scadenza l'amministratore riceve una notifica.

## Procedura

1. Apri https://developers.facebook.com/tools/explorer/ e seleziona l'app Milano Help.
2. In "User or Page" scegli **User Token**.
3. Aggiungi questi permessi:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish`.
4. Premi **Generate Access Token** e conferma la Pagina Milano Help e l'account Instagram collegato.
5. Copia il token (breve durata, ~1 ora).
6. Apri https://developers.facebook.com/tools/debug/accesstoken/, incolla il token, premi **Debug**,
   poi **Extend Access Token** in fondo: copia il nuovo token di lunga durata.
7. In Lovable: Project settings → Secrets → **META_ACCESS_TOKEN** → aggiorna il valore
   (oppure chiedi in chat "aggiorna il token Meta").
8. Pubblica di nuovo il sito, così la versione online usa il nuovo token.

## Verifica

Nello strumento di debug il token deve mostrare la scadenza a ~60 giorni e i 5 permessi sopra.
Il giorno dopo controlla nei log social (tabella social_post_logs) che non ci siano errori 190.

## Dati fissi

- Pagina Facebook: 1030236583507467 (segreto META_PAGE_ID)
- Instagram: 17841441770517087 (segreto META_IG_USER_ID)
