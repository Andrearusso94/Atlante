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

---

## Blocco 5 — Tour (`startTour/endTour/advanceSlide/scheduleSlide/updateTourBar/tourGoRegion`)

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 997-998 | `TOUR` (9 regioni), `SLIDE_MS=5200` | `data/peste.ts` `TOUR`/`SLIDE_MS` | ✓ identici |
| 1035-1036 | `tourPrev`/`tourNext`: wrap circolare, sempre toglie la pausa | `Tour.tsx` `goRegion` | ✓ |
| 1034 | play/pausa: scambia icona ❚❚/▶ | `Tour.tsx` `handleTogglePause` | ✓ |
| 1006 | "Tappa N / 9" + etichetta regione | `Tour.tsx:136-139` | ✓ |
| 145-167, 295-304 | CSS `.tool-b`/`#tourBar`/`.tour-nav`/`.tour-label`/`.tour-step`/`.tour-x` (colori, dimensioni) | `Tour.module.css` | ✓ 1:1 (manca solo il posizionamento, vedi ✗5) |

**✗ mancante:**

1. **`ensurePlagueReady` non è mai stata implementata.** RICOGNIZIONE-v12.md §1 la pianificava come `features/plague/ensurePlagueReady.ts`, condivisa da Tour e Quiz: carica `FALLBACK.peste` come scena corrente, mostra la lezione, ferma un'eventuale animazione, forza i confini all'anno 1349. **Non esiste nessun file `features/plague/` né alcuna chiamata a `ensurePlagueReady` in tutto `src/`** (verificato per grep). `Tour.tsx handleStart` si limita ad accendere `bordersOn`/`plagueActive` sull'anno e sulla scena CORRENTI, qualunque essi siano — non sull'anno 1349 né su `FALLBACK.peste`. Se l'utente non ha già caricato la Peste a mano, il layer cliccabile potrebbe non comparire affatto e il pannello lezione resta su un'altra scena. È la lacuna più grande di questa tranche: condivisa identica dal Quiz (vedi Blocco 6).
2. **Nessuna esclusione reciproca col Quiz.** v12 `startTour`: `if(quizActive||quizBar.classList.contains("on"))quizExit();` (riga 1023). `Tour.tsx handleStart` non dispatcha mai `endQuiz()`: avviare il tour mentre il quiz è attivo li lascia entrambi attivi insieme (e viceversa, Blocco 6 ✗2).
3. **Esc non chiude il tour.** v12, terza catena Esc (righe 1099-1106): `if(tourActive){endTour();return;}`. Nessun componente React ascolta Esc per `endTour` (verificato per grep su tutto `src/features/`).
4. **Ritardo di 680ms prima dell'apertura della card assente.** v12 `tourGoRegion` (riga 1008-1014): vola sulla regione, *poi* apre la card Instagram dopo un `setTimeout(...,680)` — il tempo per la camera di arrivare. `Tour.tsx:78-84` chiama `onFlyTo` e `onOpenIgCard` nello stesso istante: la card appare subito, non quando la camera è arrivata.
5. **Posizione della barra attiva sbagliata.** v12 `#tourBar` è un overlay fisso indipendente (`position:fixed;bottom:190px;left:50%`, riga 157), separato dal `#toolBox` dei lanciatori. `Tour.module.css .bar` non ha alcun `position`: quando il tour è attivo, la barra finisce dentro `.tools` (il contenitore fisso a sinistra, `top:50%;left:18px` — `App.module.css`), non in basso al centro. Stesso problema nel Quiz (Blocco 6 ✗5).

**⚠ differenza non pre-approvata, ma documentata nel codice (da confermare):**

- v12 lascia `bordersOn`/Peste accesi per sempre dopo il tour; `Tour.tsx:40-44` li ripristina invece allo stato precedente all'ingresso (bookkeeping `ownedBordersRef`/`ownedPlagueRef`). Miglioramento deliberato e commentato, non sul brief originale.
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

**✗ mancante:**

1. **`ensurePlagueReady` non è mai stata implementata** — stesso gap esatto del Tour (Blocco 5 ✗1): `Quiz.tsx handleStart` accende solo `bordersOn`/`plagueActive`, non carica mai `FALLBACK.peste` né forza l'anno 1349.
2. **Nessuna esclusione reciproca col Tour.** v12 `startQuiz`: `if(tourActive)endTour();` (riga 1064). `Quiz.tsx handleStart` non dispatcha mai `endTour()`.
3. **Esc non chiude il quiz** — stesso gap del Tour (terza catena Esc, riga 1102: `if(quizActive||quizBar.classList.contains("on")){quizExit();return;}`).
5. **Posizione della barra attiva sbagliata** — stesso problema del Tour (Blocco 5 ✗5): `Quiz.module.css .bar` non ha `position:fixed;top:18px;left:50%` (v12 riga 170).
6. **Testo "Preparo la mappa…" assente** — conseguenza diretta del punto 1: non c'è alcun caricamento asincrono da segnalare finché `ensurePlagueReady` non esiste.

---

## Blocco 7 — Timeline (`#play`, `#scrub`, `#curYear`)

| v12 (righe) | Comportamento | Implementazione React | Stato |
|---|---|---|---|
| 949 | play/pausa: scambia icona ❚❚/▶ | `Timeline.tsx handleTogglePlay` | ✓ |
| 950 | scrub 0-1000 → progress 0-1, ferma sempre il play | `Timeline.tsx handleScrub` | ✓ |
| 1117 | avanzamento automatico `progress=(progress+.0014)%1` | `engine/loop.ts stepProgress` | ✓ identico |
| 43-49, 200 | CSS `#timeline`/`#play`/`#scrub`/`#curYear` + override `body.present` | `Timeline.module.css` | ✓ 1:1 |
| 1113 | rotazione automatica del globo suppressa durante tour/quiz (`!tourActive&&!quizActive`) | `App.tsx:106-108` `setIdleSpinSuppressed(tourActive\|\|quizActive)` | ✓ |

**✗ mancante:**

1. **Nessun reset/auto-play quando si carica una scena nuova.** v12 `renderScene(s)` termina *sempre* con `progress=0;scrub.value=0;playing=true;timeline.classList.add("on")` (riga 529-530): ogni scena nuova (IA, fallback, file caricato) riparte da zero e si avvia da sola. `GlobeEngine.renderScene` (React) non tocca mai `progress`/`playing`: il callback `onSceneReady` esiste (`GlobeEngine.ts:42,109`) ma `App.tsx` non lo registra (stesso pattern di `onBordersEraChange` prima del fix di oggi, Blocco 4) — generare una scena nuova lascia lo scrubber dov'era, in pausa se era in pausa.
2. **La barra è sempre visibile, mai nascosta.** v12 `#timeline{display:none}` finché `renderScene` non aggiunge `.on` (riga 43-44, mai più rimossa) — la barra non esiste finché non c'è almeno una scena. In React `<Timeline/>` è sempre montata in `App.tsx` dal primo render. Impatto pratico ridotto: `App.tsx:82` carica già `FALLBACK.peste` al mount ("scena di prova per verificare il cablaggio"), quindi nella build attuale c'è sempre una scena fin dall'inizio — ma se quel caricamento di test venisse rimosso, la differenza diventerebbe visibile.

---

## Blocchi non ancora passati in rassegna

Nessuno — Tour/Quiz/Timeline erano gli ultimi tre elencati. Eventuali sezioni del v12
non ancora confrontate (se ce ne sono) vanno individuate con una nuova lettura integrale
del file di riferimento.
