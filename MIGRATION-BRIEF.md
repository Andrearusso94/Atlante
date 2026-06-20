# Brief di migrazione — da incollare come primo messaggio a Claude Code

> Una volta dentro il Codespace con Claude Code autenticato, incolla tutto il
> testo qui sotto (dal blocco di istruzioni in poi) come primo messaggio.

---

Migra l'app a singolo file `atlante-generatore-ia-v12.html` in un progetto
Vite + React + TypeScript + Redux Toolkit. Prima fai RICOGNIZIONE: leggi il
file, mappa le parti e PROPONIMI la divisione in moduli e il piano. Aspetta
la mia conferma prima della migrazione vera.

OBIETTIVO DELLA FASE 1: parità di funzioni. Non aggiungere né togliere niente,
non modernizzare: porta il v12 così com'è in un'architettura pulita.

Vincoli architetturali (NON negoziabili):
- Motore three.js estratto come modulo TS framework-agnostico (classe
  `GlobeEngine`): shader, slerp, ring, scrubber, borders, plagueLayer.
  NON usare react-three-fiber. React possiede solo la UI e invia comandi
  al motore.
- three pinnato ESATTO a `0.128.0` (non `^`), importato come modulo npm.
  Accetta type imperfetti per r128 (any o un piccolo .d.ts shim).
- Redux Toolkit con sole 3 slice: `spec`, `lesson`, `mode` (tour/quiz/present).
  Nessun oggetto three.js nello store.
- TypeScript: tipizza `SceneSpec` e i 5 archetipi (pulse, journey, spread,
  network, territory), `LessonCard`, e il dataset `PESTE`.
- CSS: porta il CSS esistente come foglio globale (variabili tema, body.present,
  stili condivisi) + CSS module per i singoli componenti (ig card, tour bar,
  quiz bar). NIENTE Tailwind né CSS-in-JS.

Backend / API (proxy Cloudflare Worker, in `worker/`):
- Il client chiama SOLO `/api/genera` e `/api/lezione`. Mai api.anthropic.com
  dal browser; la chiave resta lato Worker; i system prompt stanno server-side.
- RISCRIVI il Worker per il v12, non riusarlo com'è:
  · `/api/genera`: inietta il SYS del generatore, inoltra alla Messages API.
  · `/api/lezione`: inietta il SYS della lezione E inoltra il tool web_search;
    restituisci i blocchi di testo della risposta.
- Dev loop: configura Vite + `wrangler dev` insieme, con `/api/*` proxato al
  Worker, così l'IA si testa in locale. Chiave in `.dev.vars` (MAI nel repo).
- Build/deploy: `wrangler.toml` con Static Assets su `dist/` (non più public/);
  Workers Builds deve eseguire `npm run build` prima del deploy.

Golden principle: l'IA traduce e spiega soltanto; coordinate, confini e date
SOLO da historical-basemaps e Wikidata, mai inventate. Mantieni l'avviso
`lastDataNote` ("verifica prima dell'uso in classe").

Struttura: src/engine, src/data/peste.ts, src/store, src/features
(generator/lesson/tour/quiz/igCard), src/types/scene.ts, src/api, App.tsx;
worker/ per il proxy.

Procedi a piccoli passi con il type-check che passa a ogni stadio; inizializza
git, ESLint e Prettier.

CRITERIO DI "FATTO" — nella versione React devono funzionare identiche al v12:
generatore IA + 5 archetipi; confini reali per epoca con scrubber sulle date;
modulo Peste (dataset PESTE, confini 1300, regioni cliccabili); tour guidato
auto-avanzante; quiz clicca-la-regione con punteggio; modalità Presentazione;
card-storia stile Instagram swipeable; tavole illustrate SVG (le 10 scene);
lezione per evento (modale) con web_search; salva/carica lezione JSON;
avviso lastDataNote.
