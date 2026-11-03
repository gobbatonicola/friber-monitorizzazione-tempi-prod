# Tempi Friber 2.0: misura dei tempi nel reparto finitura

Webapp per tablet Android che registra i tempi delle lavorazioni post-colatura per ODP e postazione: taglio, sbavatura (nastro, manuale, Trebi) e sabbiatura.

- Funziona **sempre offline** e i dati restano sul tablet.
- **Non registra nulla sugli operatori.**

## 1. Pubblicazione su GitHub Pages (una volta sola)

1. Crea un account su github.com e un repository, ad esempio `friber-tempi`. Può essere pubblico: il codice non contiene dati aziendali.
2. Nel repository apri **Add file → Upload files** e trascina **tutto il contenuto** di questa cartella, comprese le sottocartelle `css`, `js`, `vendor`, `fonts`, `img`, `icons` e il file `.nojekyll`. Poi premi **Commit changes**.
3. Vai su **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main, / (root) → Save**.
4. Dopo 1–2 minuti l'app è disponibile a `https://<account>.github.io/friber-tempi/`.

## 2. Installazione sul tablet

1. Collega il tablet a internet, solo per questo passaggio, e apri l'indirizzo con **Chrome**.
2. Menu ⋮ → **Installa app** (oppure **Aggiungi a schermata Home**).
3. Apri **Tempi Friber** dall'icona. Da qui in poi funziona anche senza rete.
4. Entra nell'area supervisore (🔒, PIN iniziale **1234**) e cambia subito il PIN. Annota il **codice di recupero** di 12 cifre: se dimentichi il PIN, lo scrivi al posto del PIN.

## 3. Uso in reparto

**Operatore** (la guida è anche nell'app, tasto ?)

1. Nella pagina iniziale tocca la foto della tua macchina. Ogni postazione ha la sua pagina.
2. Tocca **Inizia una lavorazione** e scegli l'ODP. In cima trovi quelli con pezzi pronti per quella fase. Alle smerigliatrici a nastro indichi dove vanno i pezzi dopo: **sbavatura manuale** oppure **direttamente in sabbiatura**.
3. Conta i pezzi buoni e gli scarti con **+** e **−**, oppure tocca il numero e scrivi la quantità (**Aggiungi** o **Totale**).
4. **Pausa** ferma il tempo e chiede un motivo facoltativo. A fine turno metti in pausa e il giorno dopo tocca **Riprendi**.
5. **Fine** chiude l'ODP su quella macchina, dopo aver confermato i pezzi.
6. Dopo ogni azione hai 8 secondi per toccare **Annulla**. Una lavorazione chiusa per errore oggi si riapre con **Riapri**.

**Supervisore** (🔒 + PIN)

- **Importa ODP**: salva sul tablet gli Excel ricevuti per email e sceglili, anche le tre linee insieme. Prima vedi l'anteprima di cosa cambia. In alternativa, da Gmail o dall'app File: **Condividi → Tempi Friber** (funziona con l'app installata).
- **Esporta Excel**: un file con 9 fogli (Lavorazioni, Sessioni, Pause, Scarti, Tempi articolo, Riepilogo ODP, Colate giornaliere, Registro modifiche, Legenda). Lo trovi in Download, da allegare all'email.
- **Panoramica**: il diagramma della giornata per postazione, le code del reparto e i promemoria (PIN, import, export).
- **Da verificare**: chiusure automatiche, lavorazioni senza pezzi o aperte da giorni, tempi fuori scala, ODP con più pezzi lavorati che disponibili.
- **Analisi tempi**: ore per postazione e per fase, pause per motivo, minuti per pezzo per articolo e fase. La mediana è la base proposta per il tempo standard.
- **Lavorazioni**: correzioni, eliminazione e inserimento a mano. Ogni modifica finisce nel registro e nell'export.
- **ODP** e **Percorsi articoli**: archiviazione degli ODP finiti, percorso di sbavatura per articolo (imparato dall'app e bloccabile).
- **Backup** e **Impostazioni**.

## 4. Regole di calcolo

- **Tempo netto**: somma delle sessioni di lavoro, pause escluse.
- **Chiusura automatica**: una sessione aperta oltre il limite (8 ore, modificabile anche per fase) viene chiusa al limite e la lavorazione va in pausa con un avviso rosso. In Impostazioni puoi attivare anche la pausa automatica agli orari di fine turno.
- **Percorso dei pezzi**: Colati → Taglio → Sbavatura → Sabbiatura → Finiti. Nastro e manuale sono intercambiabili; la sbavatura può essere di cinque tipi:
  - solo nastro (nastro → sabbiatura);
  - solo manuale (manuale → sabbiatura);
  - nastro, poi manuale (nastro → manuale → sabbiatura);
  - manuale, poi nastro (manuale → nastro → sabbiatura);
  - Trebi (Trebi → sabbiatura).

  Sia il nastro sia il manuale dichiarano dove vanno i pezzi: all'altra sbavatura oppure direttamente in sabbiatura. La proposta viene dal percorso dell'articolo, imparato dalle scelte fatte in reparto. Una sbavatura lavora prima i pezzi arrivati dall'altra, poi quelli che arrivano direttamente dal taglio.
- **Limiti sui pezzi**: al taglio buoni + scarti non superano i pezzi colati dell'ODP. Nelle fasi successive non superano i pezzi arrivati dalla fase precedente (limite a cascata). Il **+** e il tastierino si fermano al limite e la pagina mostra quanti pezzi si possono ancora registrare. Valgono anche per le correzioni e gli inserimenti del supervisore, e non si elimina una lavorazione i cui pezzi sono già stati lavorati a valle.
- **Fase completata**: quando tutti i pezzi colati di un ODP sono passati da una fase, quella fase per l'ODP non si può più iniziare né riaprire. Nella lista degli ODP compare tra i *Completati in questa fase*.
- **Avviso all'avvio**: se la fase precedente non ha ancora pezzi per l'ODP, l'app lo segnala ma lascia iniziare.
- **Causa degli scarti**: a ogni scarto aggiunto l'operatore tocca la causa (difetto di colata, errore di lavorazione, rottura o caduta, altro; l'elenco si modifica in Impostazioni). Le cause sono in *Analisi tempi* e nel foglio *Scarti* dell'export.
- **Code e accumuli**: da tagliare, in attesa di sbavatura, in attesa di manuale, in attesa di sabbiatura. Si vedono nella home, nel dettaglio ODP giorno per giorno e nell'export.
- **Import**: lo stesso ODP compare su più righe, una per giorno di colata, e in più file: si raggruppa per numero ODP. Le righe con impianto vuoto compaiono uguali in tutti i file: valgono solo nel file della linea dell'ODP. Gli ODP non vengono mai cancellati.

## 5. Protezione dei dati

- **Backup automatico** ogni giorno al primo tocco, nella cartella Download (`friber_backup_AAAA-MM-GG_….json.gz`, circa 1 MB dopo un anno di dati). Conserva gli ultimi e cancella ogni tanto i più vecchi.
- **Copie interne**: una al giorno, per gli ultimi 10 giorni, più una prima di ogni ripristino o azzeramento.
- Se si cancellano i dati di Chrome o si disinstalla l'app, restano solo i backup in Download: ripristinali da 🔒 → Backup.
- Se la data o l'ora del tablet tornano indietro rispetto ai dati registrati, compare un avviso rosso.

## 6. Aggiornamenti e modifiche

- Macchine, fasi e motivi di pausa predefiniti si modificano in `js/config.js`.
- Dopo una modifica, cambia `VERSIONE` in `sw.js` (ad esempio `friber-tempi-2.0.1`) e ricarica i file su GitHub.
- Il tablet mostra l'avviso **Nuova versione disponibile → Aggiorna**: i dati non si perdono.
- Se sul tablet era installata la versione 1.0, i dati vengono migrati automaticamente al primo avvio.

## 7. Contenuto della cartella

| Percorso | Contenuto |
|---|---|
| `index.html`, `manifest.webmanifest`, `sw.js` | Pagina, installazione, funzionamento offline e ricezione file |
| `css/app.css` | Stile |
| `js/` | Logica: `model.js` (calcoli), `importer.js`, `exporter.js` e `xlsxwriter.js` (Excel), `backup.js`, `db.js` (archivio), `app.js` |
| `js/views/` | Pagine: home, macchina, ODP, supervisore |
| `vendor/xlsx.full.min.js` | Lettura dei file Excel (SheetJS, licenza Apache 2.0) |
| `fonts/` | Barlow e Barlow Condensed (licenza SIL OFL, vedi `OFL-Barlow.txt`) |
| `img/`, `icons/` | Foto delle postazioni e icone dell'app |
