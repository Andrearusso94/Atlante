# Mappa di ricognizione — v12 → architettura React/TS/Redux

> Ricognizione fatta sul file `atlante-generatore-ia-v12.html` (~1133 righe).
> Mappa ogni funzione/sezione al suo modulo di destinazione, così la migrazione
> parte da un piano concreto invece che da zero. Da dare a Claude Code insieme al brief.
>
> **Confine onesto:** questa è la *destinazione*. La riscrittura vera (classe `GlobeEngine`
> e componenti React) va fatta in Claude Code, perché tocca il motore three.js imperativo.

---

## Stato temporaneo da assorbire in GlobeEngine

Mano a mano che i blocchi del motore vengono portati, ogni file teneva il proprio stato
"alla v12" (`let`/`const` di modulo, o un oggetto restituito da una factory) invece di
inventare i campi di una classe che non esisteva ancora. Dal blocco 5 la classe
`engine/GlobeEngine.ts` esiste e possiede questo stato come campi **privati**: la
tabella sotto registra cosa è stato assorbito e come, e cosa resta ancora a livello
di modulo (di proposito, vedi sotto).

| File | Stato (era) | Stato (ora, dal blocco 5) |
|---|---|---|
| `engine/scene.ts` | `aiLayer`, `updaters`, `sceneLabels`, `yearAt`, `curYearFn`, `lastDataNote` — `let`/`const` di modulo | raggruppati in `SceneRuntimeState` (`createSceneState()`); `GlobeEngine` ne possiede una copia privata (`this.sceneState`) e la passa per riferimento a `renderScene`/`clearScene`/`createLoop`. `matGold`/`matHalo`/`makeLabel`/`makeShip`/`placeShip` restano funzioni/risorse condivise senza stato proprio (nessuna le muta dopo la creazione: innocuo condividerle) |
| `engine/borders.ts` | `bordersFile`, `bordersObj`, `bordersBusy`, `bordersOn` — `let` di modulo esportati | raggruppati in `BordersRuntimeState` (`createBordersState()`); `GlobeEngine` la possiede come `this.bordersState`. `geoCache`/`bordersCache` (cache di fetch/build, non "stato" nel senso di *cosa sto mostrando ora*) restano cache di modulo |
| `engine/globe.ts` | `createGlobe(container)` ritorna un oggetto `Globe` | invariato: `GlobeEngine.mount()` lo chiama e tiene il risultato in `this.globeHandle` |
| `engine/loop.ts` | `createLoop(g, onTick, ...)` leggeva `updaters`/`sceneLabels`/`yearAt`/`curYearFn`/`bordersOn`/`bordersFile`/`bordersObj`/`bordersBusy` da import live di scene.ts/borders.ts | ora li riceve per riferimento via `LoopDeps.scene`/`LoopDeps.borders`/`LoopDeps.plague` (gli stessi `SceneRuntimeState`/`BordersRuntimeState`/`PlagueRuntimeState` di GlobeEngine) — `progress`/`playing`/`curYearNum`/`rafId` restano chiusi nella closure di `createLoop`, e `GlobeEngine` tiene il `LoopHandle` in `this.loopHandle` |
| `engine/controls.ts` | `dragging`, `autoPause`, `qTarget` — `let` di modulo esportati | **non toccato nel blocco 5** (assorbiti solo "i let di borders.ts e scene.ts", per scelta esplicita) — resta condiviso a livello di modulo; se si creassero due `GlobeEngine` insieme questi tre si calpesterebbero a vicenda. Gap noto, non ancora un problema (un solo motore montato in App.tsx) |
| `engine/plague.ts` | — | **nessuno stato di modulo da assorbire**: scritto fin dall'inizio con lo stesso pattern del blocco 5 (`createPlagueState()` → `PlagueRuntimeState`); dal blocco 7 `GlobeEngine` la possiede come `this.plagueState`. Il `Raycaster` condiviso (`ray`, scratch) resta di modulo come `_tmp` in loop.ts: innocuo, si reimposta per intero a ogni chiamata |

**Ponti chiusi nel blocco 7**: `GlobeEngine` ora ha `this.plagueState`; `pickPlagueRegionAt`
chiama `resolvePlagueRegion`; `enablePlague(on)` chiama `syncPlague` (true) o `teardownPlague`
direttamente (false, bypassando il check "want" di syncPlague — `enablePlague(false)` deve
smontare comunque); l'`onTap` di `attachPointerControls` dentro `mount()` ora risolve la
regione e chiama `onPlagueRegionClick`; `tickPlague` del loop è collegato a
`tickPlagueMarks(plagueState, t)`; `setBorders`/`setYear` richiamano `syncPlague` subito dopo
(privato `syncPlagueWithBorders()`), invece delle due chiamate separate del v12
(`teardownPlague()` diretto sull'off in `bToggle`, `updateBorders`+`syncPlague()` sull'on).

**Ponti chiusi nel blocco 7-bis**: il cambio *automatico* dei confini dentro `engine/loop.ts`
(quando lo scrubber/le scene fanno avanzare l'anno e `nearestFile` cambia file) ora richiama
`syncPlague` esattamente come il v12 — `LoopDeps` ha un campo `plague` (lo stesso
`PlagueRuntimeState` che `GlobeEngine` possiede), e dentro il `.then()` di `updateBorders` la
chiamata a `syncPlague` avviene **incondizionatamente** (sia che il caricamento sia riuscito
sia che sia fallito), nello stesso punto in cui nel v12 `syncPlague()` era l'ultima riga di
*ogni* `updateBorders()`. Coperto da test: `loop.test.ts` — Peste attiva sul 1300, lo
scrubber porta l'anno al 1500 senza passare da `setYear`/`setBorders`, il layer si smonta da solo.

**Ponti ancora da collegare**:
- `engine/loop.ts`: `isIdleSpinSuppressed?` è collegato (`GlobeEngine.setIdleSpinSuppressed(on)`),
  ma nessuna feature lo chiama ancora (in attesa che tour/quiz, stato React/`modeSlice`,
  vengano collegati).
- `ensurePlagueReady` (orchestrazione: carica scena Peste + anno 1349 + lezione + ferma il
  play) resta deliberatamente fuori dal motore — vive a livello feature/React
  (`features/plague/`, già annotato in §1 e nell'interfaccia di comando).
- `App.tsx`: monta/smonta `GlobeEngine` (blocco 5), ma non chiama ancora `renderScene`/
  `setBorders`/`enablePlague`/ecc. — niente è ancora collegato allo store Redux né alle feature.

---

## 1. Motore 3D — `src/engine/` (TypeScript framework-agnostico, NO React)

| Sezione v12 | Funzioni | Destinazione |
|---|---|---|
| Setup globo, shader, texture | `texL`, `rdy`, `uniforms.hasTex` | `engine/globe.ts` |
| Matematica/geometria (pure) | `ll2v`, `lonlat2v`, `slerp`, `pathWp`, `arc`, `v2ll`, `pip`, `gcDeg`, `parseISO`, `dateLabel`, `featCentroid` | `engine/geo.ts` *(funzioni pure → test, issue C1)* |
| Confini storici | `cacheGeo`, `nearestFile`, `filesInSpan`, `geomRings`, `subjectRings`, `allRings`, `ringsToSeg`, `ensureBorders`, `updateBorders`; costanti `CDN`, `AVAILABLE`, `geoCache` | `engine/borders.ts` |
| Wikidata (archetipo pulse) | `wdSearch`, `wdEntity`, `resolveItem` | `engine/wikidata.ts` |
| Render scena + archetipi | `clearScene`, `renderScene` (dispatcher), `makeShip`, `placeShip`, `makeLabel` | `engine/scene.ts` + `engine/archetypes/{pulse,journey,spread,network,territory}.ts` |
| Layer Peste — parte motore | `teardownPlague`, `syncPlague`, `resolvePlagueRegion` | `engine/plague.ts` — **fatto (blocco 6)**, collegato a `GlobeEngine` (blocco 7) |
| Tavole SVG (le 11 scene) | `svgWrap`, `plate` (+ icone `IC_*`, palette `P_*`) | `engine/plates.ts` — **fatto (blocco 6)**, generatori di stringhe SVG puri |
| Camera/interazione/loop | drag pointer, `flyTo`, `animate` (loop con `onTick`, issue stato-animazione) | `engine/controls.ts` + `engine/loop.ts` |

> **`ensurePlagueReady` va scomposta** (era un'unica funzione mista nel v12):
> - **Motore** (`engine/plague.ts`): rendere disponibile/cliccabile il layer Peste — caricare i confini del 1349, attivare il picking (`resolvePlagueRegion`).
> - **Feature** (`features/plague/ensurePlagueReady.ts`, condivisa da `features/tour/` e `features/quiz/`): orchestrazione — carica `FALLBACK.peste` come scena corrente, mostra la lezione, ferma un'eventuale animazione in play, accende `bordersOn`/anno nello store, poi chiama la parte motore.

## 2. Dati — `src/data/`

| Sezione v12 | Destinazione | Stato |
|---|---|---|
| `PESTE`, `TOUR`, `SLIDE_MS`, `QUIZ` | `data/peste.ts` | **già fatto** (tipizzato) |
| `FALLBACK` (roma/colombo/peste) + `pickFallback` | `data/fallback.ts` | **già fatto** — issue B2 chiusa: tutti e tre i fallback hanno la timeline con `detail` pieno, portati alla lettera dal v12 e tipizzati come `SceneSpec` |

## 3. Client API — `src/api/`

| v12 | Destinazione | Cambiamento chiave |
|---|---|---|
| `generate()` | `api/genera.ts` | chiama `/api/genera` (non più api.anthropic.com), poi valida con Zod (`parseSceneSpec`) |
| `aiLesson()` | `api/lezione.ts` | chiama `/api/lezione`, valida con `parseLessonCard` |
| `SYS`, `SYS_LEZIONE` | **spostati nel Worker** | non esistono più lato client |

## 4. Store Redux Toolkit — `src/store/` (solo 3 slice)

| Slice | Stato che contiene (dal v12) |
|---|---|
| `specSlice` | `currentSpec` |
| `lessonSlice` | lezione corrente, indice evento aperto, stato modale |
| `modeSlice` | tour (`tourActive`, `tourIdx`, `tourPaused`), quiz (`quizActive`, `quizScore`, `quizPos`, `quizOrder`), `present`, flag `plagueActive`, **`bordersOn`**, **`theme`** (day/term/night, da `#themeBox`) |

> **Mai** mettere oggetti three.js nello store. Lo store dice *cosa* mostrare; il motore lo esegue.
>
> **Stato di animazione ESCLUSO dallo store**: `progress`/`playing`/anno corrente (v12: `progress`, `playing`, `curYearNum`) vivono nel loop del motore (`engine/loop.ts`) e arrivano alla UI **solo** via callback `onTick(progress, playing, year)` passata da React al motore — non sono mai in Redux. `setPresent` analogamente non è un metodo di `GlobeEngine`: `present` resta in `modeSlice`, ma il toggle della classe CSS `body.present` lo fa React (in `features/present/`), reagendo al valore dello slice — non c'è alcuna chiamata al motore.

## 5. Feature UI (React) — `src/features/`

| Feature | Funzioni v12 | Destinazione |
|---|---|---|
| Generatore | input `#q`, chips, `onGenerate`, `busy` | `features/generator/` |
| Lezione | `renderLesson`, `renderFullLesson`, `openLesson`, `openModal`/`closeModal`, **Salva/Carica** (`saveBtn`/`loadBtn`, blob JSON — niente `localStorage`) | `features/lesson/` |
| Tour | `startTour`, `endTour`, `advanceSlide`, `scheduleSlide`, `updateTourBar`, `tourGoRegion`, barra tour | `features/tour/` |
| Quiz | `startQuiz`, `quizShow`, `quizAnswer`, `quizEnd`, `quizExit`, barra quiz | `features/quiz/` |
| Card Instagram | `openIgCard`, `igClose`, `igGo`, overlay/track/dots | `features/igCard/` |
| Presentazione | `presenting`, toggle `body.present` | `features/present/` — **pura CSS gestita da React**: legge `modeSlice.present` e applica/rimuove la classe in un `useEffect`. **Non** è un metodo di `GlobeEngine` (il motore non sa nulla della modalità presentazione) |
| Peste (condivisa) | parte orchestrazione di `ensurePlagueReady` (vedi nota §1) | `features/plague/` — usata da `features/tour/` e `features/quiz/` |
| **Controlli** *(case mancante, aggiunta)* | `#themeBox` (tema sole: day/term/night), `bToggle` (confini reali) | `features/controls/` — leggono/scrivono `modeSlice.theme` e `modeSlice.bordersOn`, chiamano `GlobeEngine.setBorders`/tema |
| **Timeline** *(case mancante, aggiunta)* | `#play`, `#scrub`, `#curYear` | `features/timeline/` — **non** Redux: riceve `progress`/`playing`/anno via `onTick` dal loop del motore (vedi nota §4), invia comandi play/pausa/scrub al motore |

> **Casi mancanti nella prima mappa, ora coperti**: `features/controls/`, `features/timeline/`, il guscio toolbox **"Aula"** in `App.tsx` (l'header `<div class="tool-h">Aula</div>` + i tre bottoni Presentazione/Tour/Quiz: solo composizione, nessuno stato proprio — innesca le feature present/tour/quiz), e il **coordinatore del click sul globo** (v12: `container` `pointerup` → `resolvePlagueRegion` → se quiz attivo `quizAnswer`, altrimenti se non in tour `openIgCard`, altrimenti niente). Quest'ultimo vive in `App.tsx` perché deve conoscere lo stato di più feature (quiz/tour) e l'istanza di `GlobeEngine` insieme — non appartiene a una singola feature.

## 6. Tipi — `src/types/`
- `scene.ts` — SceneSpec + 5 archetipi + LessonCard + Zod — **già fatto**
- `peste.ts` — PlagueRegion/Slide/QuizItem — **già fatto**

## 7. Backend — `worker/index.ts` — **già fatto**
Proxy `/api/genera` + `/api/lezione` (web_search), rate limit, cache, gestione errori.

> **Checkpoint verificato dal vivo**: generazione IA end-to-end in locale (`wrangler dev`
> + proxy Vite di `/api/*`) — scena reale generata da `features/generator/` (es. "guerre
> puniche", "rivoluzione francese"), `lastDataNote` mostrato correttamente, `.dev.vars`
> correttamente escluso da git.

---

## Interfaccia di comando `GlobeEngine` (il ponte React → motore)

React non tocca three.js: chiama metodi su un'istanza di `GlobeEngine` (ora vera, in
`engine/GlobeEngine.ts`, blocco 5). Stato della superficie:

- `mount(container)` / `dispose()` — **implementati**: costruiscono/distruggono `engine/globe.ts` (`createGlobe`), agganciano `engine/controls.ts` (`attachPointerControls`) e avviano/fermano `engine/loop.ts` (`createLoop(...).start()/stop()`)
- `renderScene(spec)` — **implementato** (`engine/scene.ts`, su `this.sceneState`), chiama `onSceneReady()` al termine
- `setBorders(on)` — **implementato**: `borders.setBordersOn(this.bordersState, on)` (visibilità) + `globe.setBordersBlend(this.globeHandle, on)` (shader) + richiama `syncPlague` (blocco 7)
- `setYear(year)` — **implementato**: carica/attiva i confini per un anno specifico (v12: come faceva `ensurePlagueReady` con `updateBorders(1349)`), indipendente dallo scrubber; non accende `setBorders` da solo; richiama `syncPlague` (blocco 7)
- `setTheme(theme)` — **implementato**, tema luce del globo (`globe.ts`: `"day"|"term"|"night"`)
- `flyTo(lat, lon)` — **implementato**, passa a `engine/controls.ts`
- `setIdleSpinSuppressed(on)` — **implementato**: sostituisce `!tourActive&&!quizActive` del v12 dentro `animate()`; nessuna feature lo chiama ancora
- `enablePlague(on)` — **implementato** (blocco 7): `true` chiama `syncPlague`, `false` chiama `teardownPlague` direttamente (gestisce SOLO il layer cliccabile — non carica scena/lezione/anno: quella resta `ensurePlagueReady`, orchestrazione feature)
- `pickPlagueRegionAt(x, y)` → `name | null` — **implementato** (blocco 7): `resolvePlagueRegion` su `this.plagueState`; collegato anche all'`onTap` di `mount()`, che ora chiama `onPlagueRegionClick(name)` quando risolve una regione
- `setPlaying(on)` / `setProgress(p)` — **implementati**, passano a `engine/loop.ts` (`LoopHandle`)
- callback verso React (costruttore `GlobeEngineCallbacks`): `onTick({progress, playing, yearLabel})` (mai via Redux, vedi §4), `onBordersEraChange(eraLabel)` (epoca dei confini *o della Peste*, v12: testo di `#bEra` — diversa da `onTick`), `onSceneReady()`, `onPlagueRegionClick(name)` (dall'`onTap` di `mount()`) — **tutte collegate**

> **`setPresent` NON fa parte di questa interfaccia.** La modalità presentazione non tocca mai il motore: è solo `body.present` gestita da React in `features/present/` a partire da `modeSlice.present`.

`byName(name)` (lookup in `PESTE`) resta un helper dati condiviso da tour, quiz e igCard.

---

## Invarianti da NON rompere (principio d'oro + regole progetto)

1. Coordinate/confini/date solo da historical-basemaps e Wikidata; `pulse` senza coordinate; `territory` senza poligoni.
2. Avviso `lastDataNote` ("verifica prima dell'uso in classe") sempre visibile nella lezione.
3. Niente `localStorage`: Salva/Carica via file JSON (blob).
4. three.js **r128** pinnato **esatto** a `0.128.0` (versione esatta in `package.json`, non `^0.128.0`). Se `@types/three` non copre bene r128, aggiungere uno shim `.d.ts` locale minimo invece di alzare la versione o usare `any` diffuso.
5. La chiave API non compare mai nel client: vive solo nel Worker.
