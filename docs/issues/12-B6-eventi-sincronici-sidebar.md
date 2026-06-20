# [B6] Barra laterale sinistra — eventi sincronici nel mondo (lista cliccabile)

**Blocco:** B — Backlog funzionalità *(reintroduzione CONSENTITA del layer sincronico)*
**Etichette:** valore: alto · costo: medio-alto · rischio: accuratezza · area: data+feature
**Sinergie:** archetipo `pulse` (Wikidata già presente) · issue B1 (qid) · card ig esistenti

## Cosa fare
Una barra a sinistra del mappamondo, speculare a quella di destra, che mostra
eventi accaduti nel resto del mondo nello stesso arco temporale della scena
interrogata. Ogni voce apre una card stile Instagram con una breve spiegazione
di "cosa si faceva / cosa accadeva" in quel periodo altrove.

## Nota di progetto (importante)
Questo è il ritorno del "layer eventi sincronici" che era stato tagliato. La regola
del progetto lo consente SOLO come **lista cliccabile filtrata per rilevanza** — ed
è esattamente questa forma. Niente puntini muti sul globo.

## Regola d'oro (vincolante)
- Gli eventi NON li inventa l'IA: vengono da **Wikidata**, filtrati per finestra
  temporale [yearStart, yearEnd] della scena e per rilevanza.
- L'IA scrive SOLO il testo esplicativo della card, parafrasato e prudente; niente
  date o luoghi inventati.
- Stessa avvertenza `lastDataNote` ("verifica prima dell'uso in classe"): i temi
  sincronici e le "voci dell'epoca" sono i più rischiosi (vedi limiti nel brief).

## Passi
1. Sorgente eventi: query Wikidata per eventi con data dentro l'arco della scena,
   esclusa l'area del soggetto principale (è "il resto del mondo").
2. Filtro rilevanza: ordina per significatività (es. numero di sitelink Wikidata),
   prendi i primi N per evitare rumore. Vedi "Decisione" sotto.
3. UI: componente `src/features/sidebarSync/` speculare alla destra; riusa la card
   ig (`openIgCard`) già esistente.
4. Testo card: breve spiegazione via IA (riusa `/api/lezione` o un mini-endpoint
   dedicato); cache + rate limit valgono come per le altre chiamate.
5. Predisposizione qid (B1): se l'evento ha già il QID, salta la ricerca per nome.

## Decisione da prendere (filtro rilevanza)
- **A) Automatico** via Wikidata (finestra + sitelink): dinamico, copre tutto, ma va tarato.
- **B) Ibrido**: l'IA propone candidati come QID, Wikidata conferma data/luogo.
- **C) Curato** per tema (come il modulo Peste): massima qualità, ma manuale.
- *Consigliato:* A o B per la copertura, con C come riserva sui temi di punta.

## Fatto quando
A sinistra compare una lista di eventi sincronici reali (da Wikidata), ognuno con
una card ig che spiega cosa accadeva altrove in quel periodo, con l'avviso di verifica.
