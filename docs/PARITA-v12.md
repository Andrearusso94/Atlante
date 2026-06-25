# Verifica di parità — v12 → React

> Affianca `RICOGNIZIONE-v12.md` (mappa architetturale "dove va cosa"). Qui invece si
> confronta riga per riga `atlante-generatore-ia-v12.html` con l'implementazione React
> per verificare che nessun dettaglio visivo/comportamentale si sia perso nella
> migrazione. Si aggiorna un blocco alla volta, nello stesso commit delle modifiche che
> copre.

---

## Blocco 1 — Effetto "modale aperta": scena che si scosta/sfoca, pannelli che si attenuano

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 65 | `transition` su `#scene,#head,#ctrlR,#lesson,#timeline,#aiBar` | `styles/global.css` (`#scene`) + `App.module.css` (`.head/.ctrlR/.lesson/.bottomStack`) | fatto |
| 66 | `body.modal-open #scene` → `translateX(-13%) scale(1.04)` + `blur(3px) brightness(.7)` | `styles/global.css` | fatto |
| 67 | `body.modal-open #head/#ctrlR/#lesson/#timeline/#aiBar` → `opacity:.25; filter:blur(2px); pointer-events:none` | `App.module.css` (`.bottomStack` sostituisce la coppia `#timeline`+`#aiBar`, già impilati insieme) | fatto |
| 88 | override mobile (≤760px): `#scene` solo `scale(1.04)`, niente `translateX` | `styles/global.css`, stessa media query | fatto |
| 547-548 | `openModal/closeModal` scrivono/rimuovono `body.modal-open` | `features/lesson/Lesson.tsx` — `useEffect` su `modalOpen` (mancava, aggiunto in questo blocco) | fatto |
| 909, 911 | `igOpen/igClose` scrivono/rimuovono `body.modal-open` | `features/igCard/IgCard.tsx` — `useEffect` su `visible` (esisteva già da un commit precedente, ma era orfano: nessun CSS lo leggeva) | fatto |

Esito: parità completa. Ogni selettore/comportamento del v12 per questo effetto ha una
controparte React; niente scollegato, niente lasciato a metà.

---

## Legenda

- ✓ fedele — stesso comportamento, verificato riga per riga.
- ⚠ differenza intenzionale — concordata, non va corretta. Le differenze già approvate (vedi brief):
  messaggi "non ho raggiunto l'IA" assenti nel v12; validazione Zod al posto degli `alert()`;
  `lastDataNote` solo su generazioni IA; Worker proxy con timeout/errori 404/429/502/504.
- ✗ mancante — gap non intenzionale. Solo segnalato qui, **non corretto** in questo blocco.

---

## Blocco 2 — Overlay/modale: lezione (`#overlay`/`#modal`) e card Instagram (`#igOverlay`/`#igCard`)

Il toggle di `body.modal-open` è già verificato nel Blocco 1. Qui: apertura/chiusura,
click sul backdrop, Esc, focus, navigazione/swipe della card, CSS.

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 550, 925 | click sul backdrop chiude solo se il target è l'overlay stesso (non i figli) | `Lesson.tsx:214-216` (`e.target===e.currentTarget`), `IgCard.tsx:103-105` | ✓ |
| 549, 924 | bottone chiudi (`mClose`/`igClose`) | `Lesson.tsx:219-226`, `IgCard.tsx:117-119` | ✓ |
| 551 | Esc chiude la modale lezione — listener globale **incondizionato** (no-op se già chiusa) | `Lesson.tsx:70-77` — listener attaccato/staccato in `useEffect` su `modalOpen` (condizionato, non incondizionato) | ✓ stesso risultato a schermo, struttura diversa |
| 926-927 | Esc chiude la card, ←/→ cambiano slide — listener globale con guardia interna su `igOverlay.classList.contains("on")` | `IgCard.tsx:61-70` — guardia tramite attacco/distacco condizionato a `visible` | ✓ |
| 929-931 | swipe sul rullino, soglia 40px, ignora il gesto se parte su `.ig-nav` | `igCardLogic.ts` (`SWIPE_THRESHOLD_PX`, `swipeStep`) + `IgCard.tsx:86-95` | ✓ |
| 99-145 | CSS `#igOverlay`/`#igCard`/`.ig-*` (dimensioni, dots, nav, capover, actions, foot) | `IgCard.module.css` | ✓ 1:1 |
| 69-90 | CSS `#overlay`/`#modal`/`.m-*` (dimensioni, backdrop, blur) | `Lesson.module.css` | ✓ 1:1 |
| — | nessuna gestione del focus (niente `.focus()`/trap in tutto il v12) | nessuna gestione del focus in `Lesson.tsx`/`IgCard.tsx` | ✓ assenza fedele — gap di accessibilità preesistente, non introdotto da React |

**✓ corretto in questo blocco:**

3. ~~Spinner mancante nel testo di caricamento della modale.~~ v12 riga 571: `<div class="m-load"><span class="spin"></span> Sto preparando la lezione…</div>`. Portato `.spin`/`@keyframes sp` in `styles/global.css` (utility condivisa); `Lesson.module.css` la compone come `.modalSpin` (18px, v12 riga 86: `.m-load .spin{width:18px;height:18px}`) dentro un nuovo wrapper `.modalLoad` (v12 `.m-load`, riga 85). `Lesson.tsx:238-243` ora usa `<div className={styles.modalLoad}><span className={styles.modalSpin}/>Sto preparando la lezione…</div>`.

**✗ mancante (non toccato in questo blocco):**

1. **Animazione di apertura/chiusura assente.** v12 righe 72-74 (`#modal{transform:translateX(40px) scale(.97);opacity:0;transition:transform .5s cubic-bezier(.22,1,.36,1),opacity .4s ease;}` + `#overlay.on #modal{transform:none;opacity:1}`) e righe 102-104 (stesso per `#igCard`, con `translateY(20px)` invece di `translateX(40px)`). Né `.modal` (`Lesson.module.css`) né `.card` (`IgCard.module.css`) hanno queste proprietà: oggi le due modali compaiono/scompaiono di scatto (mount/unmount React diretto), senza scivolata+scala+dissolvenza.
2. **Override "tour" sul backdrop della card assente.** v12 riga 203: `body.touring #igOverlay{background:rgba(3,6,12,.28);backdrop-filter:blur(2px)}`, scritta da `startTour`/`endTour` (righe 1027/1031). Nessuna classe `touring` esiste nel codice React, né regola corrispondente in `IgCard.module.css`. Dipende dal Tour — da valutare nella prossima tranche (Tour/Quiz/Timeline).

---

## Blocco 3 — Generatore (`#aiBar`, `#q`/`#gen`, chips, `onGenerate`)

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 36-37, 241 | input: placeholder identico, `autocomplete=off`, focus → bordo oro | `Generator.module.css .input`, `Generator.tsx:74-83` | ✓ |
| 649 | Invio (`Enter`) avvia la generazione | `<form onSubmit>` invece del keydown diretto — stesso risultato, idiomatico React | ✓ |
| 650-651 | click su un chip: imposta il testo **e** genera subito (il v12 chiama `onGenerate()` direttamente, non aspetta lo stato) | `handleChipClick` passa `label` direttamente a `runGenerate(label)`, non passa dallo stato `q` | ✓ |
| 650 | testi dei 3 chip: "L'espansione dell'impero romano" / "I viaggi di Colombo" / "La peste nera" | `CHIPS` array, `Generator.tsx:10` | ✓ identici |
| 640 | guardia "vuoto o già in corso" prima di generare | `runGenerate:39-40` | ✓ |
| 644-645 | fallback automatico su errore IA (regex roma/colombo/peste in `pickFallback`) | `Generator.tsx:46-52` + `data/fallback.ts pickFallback` | ✓ |

**⚠ differenza intenzionale (in lista approvata):**

- Notice "Non ho raggiunto l'IA: mostro l'esempio offline "X"." mostrata quando scatta il fallback — il v12 non mostra nulla in questo caso. Corrisponde esattamente al punto approvato "messaggi 'non ho raggiunto l'IA' assenti nel v12".
- `lastDataNote` ridotto a una stringa generica fissa, mostrata solo dopo una generazione IA riuscita (non su file caricato/fallback/Peste) — il v12 lo varia per archetipo (Wikidata, confini reali trovati/non trovati). Corrisponde al punto approvato "lastDataNote solo su generazioni IA"; già autodocumentato in `Generator.tsx:12-14`.
- Quando falliscono sia l'IA sia il fallback, il v12 mostra un testo fisso con suggerimenti ("Prova: impero romano, Colombo, peste nera", riga 646); React mostra invece `describeSpecError(error.code)` (es. "L'IA ha risposto con un errore — riprova o cambia richiesta."). Il testo coi suggerimenti del v12 non viene mai riprodotto in nessun caso — rientra nell'ombrello approvato della messaggistica d'errore via Worker/Zod, segnalo solo per completezza.
- **Sezione "Esempi offline (senza IA)" non esiste nel v12** — 3 bottoni aggiuntivi (`Generator.tsx:108-117`) che caricano `FALLBACK.*` senza mai chiamare l'IA, con etichette diverse dai chip veri ("Impero romano" vs "L'espansione dell'impero romano"). Decisione presa: è un miglioramento intenzionale, si tiene — non un gap da correggere.

**✓ corretto in questo blocco:**

3. ~~Spinner mancante + posizione sbagliata nel messaggio "L'IA sta costruendo la scena…".~~ v12 riga 642 lo mostra sovrascrivendo il **pannello lezione** (`#lessonBody`), affiancato da `<span class="spin">`. Il messaggio è stato rimosso da `Generator.tsx` (resta solo la disabilitazione di campo/bottone, fedele a v12) e spostato in `Lesson.tsx:147-151`, che ora legge anche `selectSpecStatus` e mostra `<span className={styles.spin}/>L'IA sta costruendo la scena…` al posto del contenuto normale del pannello — esattamente come l'`innerHTML` del v12 sovrascriveva `#lessonBody`.

**✗ mancante / da decidere (non toccato in questo blocco):**

1. Il bottone "Genera" (e il campo testo) si disabilitano anche a testo vuoto (`!q.trim()`, `Generator.tsx:82,84`). Il v12 lascia sempre il bottone abilitato — il controllo "vuoto" è solo dentro `onGenerate()`, cliccare a vuoto non fa nulla ma il bottone resta normale. Differenza di UX non catalogata, lasciata com'è.

---

## Blocco 4 — Controlli (`#themeBox`, `#bordersBox`/`bToggle`, `#bEra`)

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 216-218, 961-962 | 3 bottoni tema, stesse icone (☀︎/◐/☾), `aria-pressed` esclusivo | `Controls.tsx` `THEMES` + `aria-pressed={theme===t.value}` | ✓ |
| 221, 687 | switch "Confini reali dell'epoca" — stessa label, stesso markup (span testo + span `.sw`), toggle `aria-pressed` | `Controls.tsx bordersToggle` | ✓ |
| 221 | `bordersOn` parte `false` | `modeSlice.ts` `initialState.bordersOn=false` | ✓ |
| 23-32 | CSS `.themeBox`/`.themeButton`/`.bordersToggle`/`.switch` | `Controls.module.css` | ✓ 1:1 |

**✓ corretto in questo blocco:**

1. ~~Tema predefinito sbagliato.~~ Il v12 parte su **"term"** (riga 217: `<button data-theme="term" aria-pressed="true">`; riga 355: `sun=new THREE.Vector3(1,.18,.30)`, identico a `THEMES.term`). `modeSlice.ts` aveva `theme:"day"` come default, sovrascrivendo al mount il sole corretto già inizializzato da `engine/globe.ts:76`. Corretto: `initialState.theme` ora è `"term"` — store e motore combaciano dal primo render, nessuna sovrascrittura silenziosa.
2. ~~Etichetta dell'epoca (`#bEra`) assente.~~ Il v12 mostra sotto lo switch un testo che cambia con l'anno/i confini ("mappa del mondo: 1500" o "mappa del 1300 · ☩ Peste Nera — tocca un territorio", righe 222, 684, 875). Collegato `onBordersEraChange` (già esposto da `GlobeEngine`) in `App.tsx` a un nuovo stato locale `bordersEra`, passato come prop `eraLabel` a `Controls`. Ricreata la struttura del v12: nuovo `.bordersBox` (v12 `#bordersBox`, glass+flex-column) avvolge il bottone `bordersToggle` (ora senza vetro proprio, come `.swt` nel v12) e un nuovo `.era` (v12 `#bEra`: 10px, colore ciano, min-height 12px) che mostra `eraLabel`.
3. ~~`#bEra` (punto 🟡5): mancava il terzo stato (confini spenti) e l'HTML del terzo (Peste attiva) veniva mostrato come testo letterale.~~ Il punto 2 sopra collegava già `onBordersEraChange` per due dei tre stati v12 (riga 684 "mappa del mondo: X", già corretto in `engine/borders.ts`; riga 875 lo `<span>` dorato della Peste, già corretto in `engine/plague.ts`) — mancava il terzo: v12 riga 688, spegnendo i confini `bEra.textContent=""`, un caso che il motore non emette mai via `onBordersEraChange` (né `updateBorders` né `syncPlague` chiamano il callback quando i confini sono spenti). Aggiunto un secondo `useEffect` in `App.tsx` che azzera `bordersEra` quando `bordersOn` diventa `false` (il teardown del layer Peste, stessa riga v12, avveniva già da solo tramite l'effetto esistente `engine.setBorders(bordersOn)`). **Bug trovato in corso d'opera**: `Controls.tsx` mostrava `eraLabel` con `{eraLabel}` — JSX lo *escapa* sempre, quindi lo `<span style="color:var(--gold-2)">` del terzo stato (v12 riga 875) appariva come testo letterale coi tag visibili, mai come markup colorato. Corretto con `dangerouslySetInnerHTML={{ __html: eraLabel }}` (stesso pattern già usato per il markup curato in `features/igCard/IgCard.tsx`). Test aggiunti in `Controls.test.tsx` per il caso vuoto e per il caso HTML.

---

## Blocco 5 — Tour (`startTour/endTour/advanceSlide/scheduleSlide/updateTourBar/tourGoRegion`)

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 997-998 | `TOUR` (9 regioni), `SLIDE_MS=5200` | `data/peste.ts` `TOUR`/`SLIDE_MS` | ✓ identici |
| 1035-1036 | `tourPrev`/`tourNext`: wrap circolare, sempre toglie la pausa | `Tour.tsx` `goRegion` | ✓ |
| 1034 | play/pausa: scambia icona ❚❚/▶ | `Tour.tsx` `handleTogglePause` | ✓ |
| 1006 | "Tappa N / 9" + etichetta regione | `Tour.tsx:136-139` | ✓ |
| 145-167, 295-304 | CSS `.tool-b`/`#tourBar`/`.tour-nav`/`.tour-label`/`.tour-step`/`.tour-x` (colori, dimensioni) | `Tour.module.css` | ✓ 1:1 (manca solo il posizionamento, vedi ✗5) |

**✓ corretto in questo blocco:**

1. ~~`ensurePlagueReady` non è mai stata implementata.~~ Creata `features/plague/ensurePlagueReady.ts` (porting fedele delle righe 976-984, condivisa da Tour e Quiz come pianificato in RICOGNIZIONE-v12.md §1): carica `FALLBACK.peste` come scena corrente (`dispatch(setCurrentSpec)` + `engine.renderScene`), ferma un eventuale play, accende `bordersOn` se spento e forza i confini al 1349 (`engine.setYear(1349)`). Guardia iniziale e valore di ritorno fedeli al v12 — legge/ritorna lo stato VERO del layer (`GlobeEngine.isPlagueActive()`, nuovo metodo su `plagueState.active`), non un `true` fisso. `Tour.tsx handleStart`/`Quiz.tsx handleStart` la attendono ora PRIMA di attivarsi.
2. ~~Nessuna esclusione reciproca col Quiz.~~ `Tour.tsx handleStart` dispatcha `endQuiz()` se il quiz è attivo (e viceversa in Quiz.tsx, Blocco 6). Il possesso di `bordersOn`/`plagueActive` (per il ripristino allo stato precedente, vedi sotto) non è più locale a ciascun componente: `plagueOwnership.ts` (nuovo, top-level come `plagueClickRoute.ts`) lo condivide fra Tour e Quiz tramite App.tsx, così il passaggio di mano da un tour/quiz forzatamente chiuso a quello che parte non perde il possesso da ripristinare a fine sessione.
3. ~~Esc non chiude il tour.~~ `Tour.tsx` ha ora un listener `keydown` proprio (condizionato/staccato su `tourActive`, stesso pattern di Esc-per-modale già usato in `Lesson.tsx`/`IgCard.tsx`) che chiama `handleExit()`.
5. ~~Posizione della barra attiva sbagliata.~~ `Tour.module.css .bar` ha ora `position:fixed;bottom:190px;left:50%;transform:translateX(-50%);z-index:60` (v12 riga 157): la barra non finisce più dentro `.tools`. Stesso fix nel Quiz (Blocco 6 ✓5).

**✗ mancante:**

4. **Ritardo di 680ms prima dell'apertura della card assente.** v12 `tourGoRegion` (riga 1008-1014): vola sulla regione, *poi* apre la card Instagram dopo un `setTimeout(...,680)` — il tempo per la camera di arrivare. `Tour.tsx:78-84` chiama `onFlyTo` e `onOpenIgCard` nello stesso istante: la card appare subito, non quando la camera è arrivata.

**⚠ differenza non pre-approvata, ma documentata nel codice (da confermare):**

- v12 lascia `bordersOn`/Peste accesi per sempre dopo il tour; `Tour.tsx handleExit` (via `onReleasePlague`, `plagueOwnership.ts`) li ripristina invece allo stato precedente all'ingresso. Miglioramento deliberato e commentato, non sul brief originale.
- v12 avanza slide-per-slide DENTRO la card (ogni `SLIDE_MS`) e passa alla regione successiva solo a card esaurita; `Tour.tsx:26-33` avanza invece sempre di regione ogni `SLIDE_MS`, lasciando la navigazione fra le slide della card solo manuale. Differenza deliberata e commentata.

---

## Blocco 6 — Quiz (`startQuiz/quizShow/quizAnswer/quizEnd/quizExit`)

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 1041-1050 | `QUIZ` (9 domande/risposte) | `data/peste.ts` `QUIZ` | ✓ identiche |
| 1055 | `shuffle` (Fisher-Yates) | `quizLogic.ts shuffleOrder` | ✓ stesso algoritmo |
| 1074 | confronto regione cliccata vs risposta attesa | `quizLogic.ts resolveQuizAnswer` | ✓ |
| 1076-1077 | testo feedback "✓ Esatto — …" / "✗ Era … — hai indicato …" | `quizLogic.ts quizFeedbackText` | ✓ identico |
| 1088-1089 | soglie risultato finale (.4/.75/1) | `quizLogic.ts quizResultMessage` | ✓ identiche |
| 1083 | 1650ms di blocco (`quizLock`) prima di accettare un nuovo tap | `lockRef` in `Quiz.tsx` | ✓ |
| 1070 | vista d'insieme `flyTo(54,10)` all'avvio | `OVERVIEW=[54,10]` in `quizLogic.ts` | ✓ identica |
| 169-184, 306-316 | CSS `#quizBar`/`.quiz-*` (colori, dimensioni) | `Quiz.module.css` | ✓ 1:1 (manca solo il posizionamento, vedi ✗5) |

**✓ corretto (fuori tranche, correzione isolata):**

4. ~~Punteggio/posizione avanzano troppo presto.~~ v12 incrementa `quizPos` solo *dopo* i 1650ms di feedback, dentro il `setTimeout` di `quizAnswer` (righe 1080-1083) — punteggio e feedback restano invece immediati (righe 1075-1079). `modeSlice.answerQuiz` è stato diviso in due reducer: `answerQuiz` aggiorna solo `quizScore` (immediato, come nel v12), il nuovo `advanceQuiz` aggiorna solo `quizPos` ed è dispatchato in `Quiz.tsx` dentro il `setTimeout` di `FEEDBACK_MS`, non più insieme al click. Durante la finestra di feedback la domanda a video resta quella appena risposta, non la successiva. Test aggiornati in `modeSlice.test.ts` e `Quiz.test.tsx` per coprire esplicitamente il nuovo timing.

**✓ corretto in questo blocco:**

1. ~~`ensurePlagueReady` non è mai stata implementata~~ — stesso fix del Tour (Blocco 5 ✓1): `Quiz.tsx handleStart` la attende ora prima di attivarsi.
2. ~~Nessuna esclusione reciproca col Tour.~~ `Quiz.tsx handleStart` dispatcha `endTour()` se il tour è attivo — stesso meccanismo di possesso condiviso (`plagueOwnership.ts`) del Tour (Blocco 5 ✓2).
3. ~~Esc non chiude il quiz~~ — stesso fix del Tour (Blocco 5 ✓3): listener `keydown` proprio condizionato su `quizActive`.
5. ~~Posizione della barra attiva sbagliata~~ — stesso fix del Tour (Blocco 5 ✓5): `Quiz.module.css .bar` ha ora `position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:14` (v12 riga 170), incluso l'override `body.present` (`top:26px`, v12 riga 196).

**✗ mancante:**

6. **Testo "Preparo la mappa…" assente.** v12 `startQuiz` (riga 1065) mostra questo testo nella barra mentre `ensurePlagueReady` è in corso. Non riprodotto: blocco successivo (fuori scope qui insieme a `body.touring`/animazioni modale/680ms del Tour).

---

## Blocco 7 — Timeline (`#play`, `#scrub`, `#curYear`)

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 949 | play/pausa: scambia icona ❚❚/▶ | `Timeline.tsx handleTogglePlay` | ✓ |
| 950 | scrub 0-1000 → progress 0-1, ferma sempre il play | `Timeline.tsx handleScrub` | ✓ |
| 1117 | avanzamento automatico `progress=(progress+.0014)%1` | `engine/loop.ts stepProgress` | ✓ identico |
| 43-49, 200 | CSS `#timeline`/`#play`/`#scrub`/`#curYear` + override `body.present` | `Timeline.module.css` | ✓ 1:1 |
| 1113 | rotazione automatica del globo suppressa durante tour/quiz (`!tourActive&&!quizActive`) | `App.tsx:106-108` `setIdleSpinSuppressed(tourActive\|\|quizActive)` | ✓ |

**✓ corretto in questo blocco:**

1. ~~Nessun reset/auto-play quando si carica una scena nuova (punto 🟢16).~~ v12 `renderScene(s)` termina *sempre* con `progress=0;scrub.value=0;playing=true` (riga 529, escluso `timeline.classList.add("on")` — ✗2 sotto, non in scope): ogni scena nuova riparte da zero e si avvia da sola. Creato `features/timeline/resetOnSceneReady.ts` (`resetTimelineOnSceneReady({engine, dispatch})`): chiama `engine.setProgress(0)` **prima** di `engine.setPlaying(true)` (`engine/loop.ts setProgress` ferma sempre `playing` — l'ordine inverso vanificherebbe il riavvio) e dispatcha `setPlaying(true)` per il bookkeeping di `modeSlice` (stesso doppio binario di `Timeline.tsx handleTogglePlay`). `App.tsx` ora registra `onSceneReady: handleSceneReady` nel costruttore di `GlobeEngine` (mai passato prima). Scrubber e icona si aggiornano da soli, reattivamente, via `onTick` (`Timeline.tsx` legge `tick.progress`/`tick.playing`, non Redux). Testato in `resetOnSceneReady.test.ts` con un motore finto (ordine delle chiamate + stato dello store).

**✗ mancante:**

2. **La barra è sempre visibile, mai nascosta.** v12 `#timeline{display:none}` finché `renderScene` non aggiunge `.on` (riga 43-44, mai più rimossa) — la barra non esiste finché non c'è almeno una scena. In React `<Timeline/>` è sempre montata in `App.tsx` dal primo render. Impatto pratico ridotto: `App.tsx:82` carica già `FALLBACK.peste` al mount ("scena di prova per verificare il cablaggio"), quindi nella build attuale c'è sempre una scena fin dall'inizio — ma se quel caricamento di test venisse rimosso, la differenza diventerebbe visibile.

---

## Blocco 8 — Presentazione (`setPresent`/`presentBtn`, modalità LIM) — TRANCHE 3

Modulo `features/present/` esistente da prima di questo blocco, mai sottoposto ad audit
fino ad ora — qui si confronta riga per riga con v12 righe 185-201 (CSS) e 987-994/1105
(JS), non un porting da zero.

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 987-993 | `setPresent(on)`: `body.present`, bottone `.act`, testo "Presentazione"/"Esci" | `Present.tsx` — `body.classList.toggle`, `aria-pressed`, testo del bottone | ✓ |
| 185-186 | `#head/#ctrlR/#lesson/#aiBar` → `opacity:0;pointer-events:none`, PERMANENTE (nessun hover-reveal) | `.chrome` (`Present.module.css`), composta da `App.module.css .head`, `Controls.module.css .panel`, `Lesson.module.css .panel`, `Generator.module.css .panel` | ✓ verificato: nessuna regola `:hover` su `.chrome`/`body.present` in tutto `src` (grep) |
| 191-195 | `#igCard` 460px; `.ig-name` 18px, `.ig-capt` 19px, `.ig-text` 15.5px/1.7, `.ig-foot` 11.5px | `IgCard.module.css` righe 273-294 | ✓ 1:1 |
| 196 | `#quizBar` 560px, `top:26px` (override del `top:18px` base cablato nel blocco Tour/Quiz precedente) | `Quiz.module.css .bar` | ✓ — verificato che il valore base (`top:18px`) non sia stato toccato |
| 196-198 | `.quiz-q` 19px, `.quiz-fx` 14.5px, `.tour-label` 17px, `#curYear` 26px | `Quiz.module.css`, `Tour.module.css`, `Timeline.module.css` | ✓ 1:1 |

**✓ corretto in questo blocco:**

1. **`#toolBox` non si riposizionava in presentazione.** v12 riga 188: `body.present #toolBox{left:50%;top:auto;transform:translateX(-50%);bottom:20px;flex-direction:row;width:auto;align-items:center;}` — nessuna regola equivalente esisteva per `.tools` (ex `#toolBox`, contenitore di Presentazione/Tour/Quiz): il box restava nella colonna verticale a sinistra anche in presentazione. Aggiunta `:global(body.present) .tools{...}` in `App.module.css`, valori identici al v12.
2. **Esc usciva dalla presentazione anche con tour o quiz attivi insieme — priorità violata.** v12 (righe 1100-1106): la catena Esc dà sempre precedenza a quiz/tour su "esci dalla presentazione" (`if(quizActive...)...return; if(tourActive)...return; ...; if(presenting)setPresent(false)`). `Present.tsx` aveva un listener Esc **indipendente**, che chiamava `setPresent(false)` ogni volta che `presenting` era vero, senza alcuna conoscenza di tour/quiz — con tour (o quiz) attivo insieme a presenting, Esc chiudeva *entrambi* nello stesso evento, invece di chiudere solo il tour/quiz. Corretto leggendo `tourActive`/`quizActive` da `modeSlice` e ignorando l'Esc quando uno dei due è vero (Tour.tsx/Quiz.tsx restano indipendenti e non toccati: ognuno legge lo stato del proprio render precedente sullo stesso evento, quindi l'ordine di registrazione dei tre listener non altera il risultato). Test aggiunti in `Present.test.tsx` per i due casi (tour attivo, quiz attivo) e per il ritorno alla normalità una volta finiti.

**⚠ discrepanza fra il brief di questo blocco e il v12 reale (verificata via grep sul markup originale, righe 287-291):**

- Il brief descriveva il punto 2 come "le label testuali dei bottoni (`.tool-h`) si nascondono → restano solo le icone". Nel v12 reale, `.tool-h` è **esclusivamente** l'header di sezione `<div class="tool-h">Aula</div>` (riga 288) — non le label dentro i singoli bottoni (`<span class="tb-i">` per l'icona + uno `<span>` senza classe per il testo, dentro `.tool-b`). `body.present #toolBox .tool-h{display:none}` nasconde solo "Aula"; le scritte "Presentazione"/"Tour guidato"/"Quiz" restano visibili in presentazione anche nel v12. Implementato fedele al v12 verificato (solo il riposizionamento del box, punto 1 sopra) — nessuna icona-senza-testo introdotta.

**✗ mancante (gap noto, non risolto in questo blocco):**

3. **Priorità Esc, terzo gradino (card Instagram aperta "da sola").** v12 riga 1104: `if(igOverlay.classList.contains("on"))return;` — se la card è aperta fuori da un tour, Esc la chiude (gestita dal suo stesso handler) e **non** deve anche far uscire dalla presentazione nello stesso evento (un secondo Esc, a card già chiusa, uscirebbe poi normalmente). `Present.tsx` non ha modo di sapere se `IgCard` è visibile: quello stato è locale al componente (`useState`), non in Redux né altrimenti condiviso — leggerlo richiederebbe di modificare `features/igCard/IgCard.tsx`, fuori dal blocco isolato di questa Tranche. Risultato osservabile attuale: con la card IG aperta da sola e presenting attivo, Esc chiude la card **e** esce dalla presentazione nello stesso evento, invece di chiudere solo la card. Edge case minore (non menzionato con un esempio esplicito nel brief, a differenza del caso tour/quiz) — da affrontare in un blocco dedicato a IgCard se necessario.

---

## Blocco 9 — Pannello lezione: scheda didattica (`renderLesson`, righe 533-544)

Mai passato in rassegna come blocco a sé: il Blocco 2 copre la modale (`#overlay`/
`#modal`, righe 546+) ma non il pannello di base (`#lessonBody`) che la precede nel
v12. Qui si confrontano titolo/periodo/riassunto e la riga di cronologia cliccabile.

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 540 | `esc(s.title\|\|"")`/`esc(s.period\|\|"")`/`esc(s.summary\|\|"")`: titolo, periodo e riassunto sono **sempre** renderizzati, anche vuoti — a differenza di cronologia/punti chiave/domande sotto, omesse per intero se l'array è vuoto | `Lesson.tsx:162-164` | ✓ |
| 536 | `<span class="card-x">›</span>` — chevron a fianco di ogni riga della cronologia, indica che è cliccabile | `Lesson.tsx:175-177`, `Lesson.module.css .cardChevron` | ✓ |

**✓ corretto in questo blocco:**

1. **`period`/`summary` nascondevano l'intero tag `<p>` quando il campo era vuoto/assente.** Il porting usava `{currentSpec.period && <p>...}` (stesso per `summary`): a differenza del v12, che renderizza sempre `<p class="lPeriod">`/`<p class="lSum">` (eventualmente vuoti), il React rimuoveva il tag dal DOM. Corretto in `Lesson.tsx:163-164` con `currentSpec.period ?? ""` / `currentSpec.summary ?? ""`, sempre renderizzati come nel v12 (`title` lo era già, essendo un campo obbligatorio nello schema Zod — nessun `&&` lo nascondeva).
2. **Chevron `›` mancante su ogni riga della cronologia.** Aggiunto `<span className={styles.cardChevron} aria-hidden="true">›</span>` dentro ogni `.card` (`Lesson.tsx:175-177`) e la relativa regola CSS (v12 `.card-x`, riga 60) in `Lesson.module.css`, qualificata come `.card .cardChevron` (non solo `.cardChevron`) per battere in specificità `.card span{flex:1}` già presente, che altrimenti avrebbe steso il chevron a piena larghezza invece di `flex:0 0 auto`.

Test aggiunti in `Lesson.test.tsx`: period/summary assenti restano nel DOM come tag
vuoti; period/summary presenti vengono mostrati per intero; ogni riga della cronologia
espone il chevron (`aria-hidden`, conteggio pari alle voci di `teaching.timeline`).

---

## Blocco 10 — Modale lezione: scheda completa (`renderFullLesson`, righe 553-563)

Il Blocco 2 copre l'apertura/chiusura della modale e il suo CSS; il Blocco 9 copre il
pannello (`renderLesson`, righe 533-544). Qui si confronta il **contenuto** della
modale — `#mBody`, riempito da `renderFullLesson(L,fb)` — con `Lesson.tsx:254-308`.

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 556-561 | ordine fisso delle sezioni: Contesto → Che cosa accadde → Cause → Conseguenze → "Una voce dell'epoca" → Da chiedere alla classe | `Lesson.tsx:257-298` — stesso ordine di `<Section>`/blocco citazione | ✓ |
| 554, 556-559, 561 | `sec(h,html)`: se il contenuto è vuoto, l'intera sezione (intestazione **compresa**) viene omessa — vale per Contesto/Che cosa accadde/Cause/Conseguenze/Da chiedere alla classe | `Lesson.tsx:257-298` — ogni `<Section>` è dentro `{card.X && (...)}` o `{card.X.length > 0 && (...)}`; `Section` (riga 29-36) renderizza sempre `<h3>` quando invocato, ma l'intero blocco (incluso l'`<h3>`) non monta se la guardia è falsa | ✓ |
| 558-559 | Cause/Conseguenze sono liste (`<ul><li>`), non paragrafi | `Lesson.tsx:269-275`, `278-284` | ✓ |
| 561 | Da chiedere alla classe è una lista (`<ul><li>`), non paragrafi | `Lesson.tsx:293-296` | ✓ |
| 560 | "Una voce dell'epoca": nel v12 scritta inline (`(L.quote?...)`), non passa per `sec()` come le altre — ma stesso markup risultante (`<h3>`+`<p class="quote">`), stessa regola CSS `.m-body h3` per l'intestazione | `Lesson.tsx:285-289` — usa lo stesso componente `<Section>` delle altre, dentro `{card.quote && (...)}`: output finale identico (h3 omesso se quote vuoto), nessuna differenza visibile | ✓ stesso risultato a schermo, riusa `Section` invece di duplicare il markup |
| 562 | disclaimer SEMPRE presente, testo diverso in base a `fb` (fallback/curato vs IA reale) — **distinto** dal `lastDataNote` del pannello (v12 riga 524/526, Blocco 9 non lo tocca) | `Lesson.tsx:299-306` — `{origin && <p className={styles.disclaimer}>...}`, testo `origin==="ai" ? "...IA..." : "...curata a mano."`; `origin` impostato a `"curated"` quando si usa `ev.detail` (apertura diretta o fallback su errore IA, `Lesson.tsx:92-93,103-104`) e a `"ai"` solo dopo `loadLesson.fulfilled` (`Lesson.tsx:101`) | ✓ verificato nel codice React attuale, non solo nel v12 — la distinzione esiste davvero |
| 79-84 | CSS `.m-body h3/p/.quote/ul/li` | `Lesson.module.css .sectionTitle/.quote` (paragrafi/liste senza classe dedicata, ereditano da `.modalBody`) | ✓ 1:1 |
| 87 | CSS `.m-warn` | `Lesson.module.css .disclaimer` | ✓ 1:1 |

**Nota sul disclaimer vs `lastDataNote`:** sono due avvisi distinti e non vanno
confusi. `lastDataNote` (v12 riga 524/526) appartiene al **pannello** e riguarda i
confini reali (Wikidata/historical-basemaps trovati o non trovati per l'archetipo
`territory`) — fuori scope di questo blocco, già citato nel Blocco 3 come differenza
intenzionale (`lastDataNote` ridotto a stringa generica fissa). Il disclaimer di
questo blocco appartiene alla **modale** e riguarda solo l'origine della lezione
(IA vs curata a mano): nessuna sovrapposizione fra i due.

Esito: parità completa, nessun gap. **Nessuna modifica a `Lesson.tsx`** (a differenza
del Blocco 9, dove period/summary e il chevron avevano richiesto fix): il markup
React a `Lesson.tsx:254-308` era già conforme a `renderFullLesson`. Qui sono stati
aggiunti solo i test di regressione in `Lesson.test.tsx`: con solo `context` popolato
(caso curatedCard/fallback) le altre intestazioni non vengono renderizzate; con tutti
i campi popolati le sezioni appaiono nell'ordine fisso del v12 e Cause/Conseguenze/Da
chiedere alla classe sono effettivamente `<ul><li>`. La distinzione del disclaimer
fallback/IA era già coperta dai test preesistenti ("evento con detail curato" →
"curata a mano.", "evento senza detail" → "redatta dall'IA…").

---

## Blocco 11 — Salva/Carica lezione (`saveBtn`/`loadBtn`/`loadFile`, P5 righe 935-944) — TRANCHE 3

Modulo `features/lesson/` esistente da prima di questo blocco (commit `4c1c56c`), mai
sottoposto ad audit fino ad ora — qui si confronta riga per riga con il markup v12
(righe 246-248) e la logica P5 (righe 935-944). Ultimo punto della Tranche 3 (dopo
Blocco 8 Presentazione, Blocco 9/10 pannello e modale lezione).

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 938-940 | Salva: `JSON.stringify(currentSpec,null,2)`, blob `application/json`, `<a>` mai aggiunto al DOM, `download=(title\|\|"lezione").replace(/\s+/g,"_")+".json"`, `a.click()` | `Lesson.tsx:111-120` (`handleSave`) | ✓ 1:1 |
| 941-942 | Carica: `loadBtn` apre `loadFile` (input file nascosto) via `.click()` | `Lesson.tsx:122-124` (`handleLoadClick`, `fileInputRef`) | ✓ 1:1 |
| 943 | `JSON.parse(await f.text())`; in caso di eccezione (parse **o** render a valle) → `alert("File lezione non valido.")` | `Lesson.tsx:126-142` (`handleFileChange`) — `JSON.parse` + validazione schema (`safeParseSceneSpec`) **prima** di aggiornare lo stato; errore mostrato inline (`styles.error`), niente `alert()` | ⚠ differenza intenzionale già approvata (Legenda: "validazione Zod al posto degli `alert()`") — più severa del v12 (rifiuta anche JSON sintatticamente valido ma di forma sbagliata, che il v12 lascerebbe passare silenziosamente se `renderScene`/`renderLesson` non lanciano) |
| 943 | Nessuna validazione di schema nel v12: un file con forma sbagliata ma JSON valido viene assegnato a `currentSpec` e passato a `renderScene`/`renderLesson` senza controllo | `safeParseSceneSpec` (stesso validatore Zod già usato per le risposte IA, `types/scene.ts:124`) rifiuta la forma sbagliata a monte | ⚠ vedi riga sopra, stessa differenza |
| 246-248 | `saveBtn`/`loadBtn`/`loadFile` vivono in `#aiBar` (riquadro del generatore, fascia in basso al centro) | `Lesson.tsx:210-224` (`styles.saveLoad`) — dentro il pannello **lezione** (`#lesson` equivalente), non il generatore (`features/generator/Generator.tsx`) | ✓ verificato intenzionale — `RICOGNIZIONE-v12.md:109` assegna esplicitamente "Salva/Carica" a `features/lesson/` come scelta architetturale, non una svista; nessuna perdita funzionale: in presentazione entrambi i pannelli (`#aiBar`/Generator e `#lesson`/Lesson) si nascondono comunque via `.chrome` (Blocco 8), quindi il comportamento a schermo in quel caso coincide |
| — | `saveBtn` non viene mai disabilitato visivamente: click senza `currentSpec` è un no-op silenzioso nel listener | `Lesson.tsx:211` — `disabled={!currentSpec}` (+ `.button:disabled{opacity:.5}` in `Lesson.module.css`) | ⚠ aggiunta UX non presente nel v12 (commento corretto in `Lesson.tsx:207-212`, prima affermava erroneamente "come nel v12") — innocua: `App.tsx` popola `currentSpec` sincronicamente al mount (`FALLBACK.peste`), quindi il bottone è visivamente disabilitato solo nel render iniziale prima di quell'effetto |
| — | nessun `URL.revokeObjectURL` dopo il download (richiesto in v12) | `Lesson.tsx:119` chiama `URL.revokeObjectURL(url)` dopo `a.click()` | ✓ migliora la pulizia delle risorse, zero differenza osservabile a schermo |

**✓ corretto in questo blocco:**

1. **Commento impreciso in `Lesson.tsx`.** Affermava che il `disabled` su Salva replicasse il v12 ("come nel v12"); il v12 non disabilita mai il bottone, gestisce l'assenza di scena solo internamente al click handler. Corretto per riflettere che è una scelta UX aggiunta in React, non un comportamento portato dal v12.

Nessuna modifica di comportamento: `handleSave`/`handleLoadClick`/`handleFileChange` erano già
conformi al v12 (a meno delle differenze ⚠ già elencate, tutte pre-approvate o innocue).
Test già presenti in `Lesson.test.tsx` coprono Salva (blob/JSON/filename), Carica file
valido (sostituisce la scena, niente chiamata IA) e Carica file non valido (errore
inline, niente `alert()`) — nessun test aggiuntivo necessario.

Esito: parità funzionale completa, nessun gap reale. Le uniche differenze trovate sono
intenzionali (validazione Zod, posizione del controllo, piccola aggiunta UX sul
disabled) e nessuna toglie funzionalità presente nel v12.

---

## Blocchi non ancora passati in rassegna

Nessuno — Tour/Quiz/Timeline/Presentazione/Salva-Carica (Tranche 3, completa con questo
blocco) erano gli ultimi elencati. Eventuali sezioni del v12 non ancora confrontate (se
ce ne sono) vanno individuate con una nuova lettura integrale del file di riferimento.
