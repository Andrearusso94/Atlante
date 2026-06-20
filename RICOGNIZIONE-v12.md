# Mappa di ricognizione — v12 → architettura React/TS/Redux

> Ricognizione fatta sul file `atlante-generatore-ia-v12.html` (~1133 righe).
> Mappa ogni funzione/sezione al suo modulo di destinazione, così la migrazione
> parte da un piano concreto invece che da zero. Da dare a Claude Code insieme al brief.
>
> **Confine onesto:** questa è la *destinazione*. La riscrittura vera (classe `GlobeEngine`
> e componenti React) va fatta in Claude Code, perché tocca il motore three.js imperativo.

---

## 1. Motore 3D — `src/engine/` (TypeScript framework-agnostico, NO React)

| Sezione v12 | Funzioni | Destinazione |
|---|---|---|
| Setup globo, shader, texture | `texL`, `rdy`, `uniforms.hasTex` | `engine/globe.ts` |
| Matematica/geometria (pure) | `ll2v`, `lonlat2v`, `slerp`, `pathWp`, `arc`, `v2ll`, `pip`, `gcDeg`, `parseISO`, `dateLabel`, `featCentroid` | `engine/geo.ts` *(funzioni pure → test, issue C1)* |
| Confini storici | `cacheGeo`, `nearestFile`, `filesInSpan`, `geomRings`, `subjectRings`, `allRings`, `ringsToSeg`, `ensureBorders`, `updateBorders`; costanti `CDN`, `AVAILABLE`, `geoCache` | `engine/borders.ts` |
| Wikidata (archetipo pulse) | `wdSearch`, `wdEntity`, `resolveItem` | `engine/wikidata.ts` |
| Render scena + archetipi | `clearScene`, `renderScene` (dispatcher), `makeShip`, `placeShip`, `makeLabel` | `engine/scene.ts` + `engine/archetypes/{pulse,journey,spread,network,territory}.ts` |
| Layer Peste — parte motore | `teardownPlague`, `syncPlague`, `resolvePlagueRegion`; la parte di `ensurePlagueReady` che attiva i confini 1349/il layer cliccabile | `engine/plague.ts` |
| Tavole SVG (le 10+1 scene) | `svgWrap`, `plate` (+ generatori per scena) | `engine/plates.ts` *(generatori di stringhe SVG, puri)* |
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

---

## Interfaccia di comando `GlobeEngine` (il ponte React → motore)

React non tocca three.js: chiama metodi su un'istanza di `GlobeEngine`. Superficie minima suggerita,
ricavata da cosa il v12 fa già:

- `mount(container)` / `dispose()`
- `renderScene(spec)` — disegna un archetipo
- `setBorders(on)` / `setYear(year)` — switch confini + scrubber
- `enablePlague(on)` / `flyTo(lat, lon)` — usati da tour e quiz
- `pickPlagueRegionAt(x, y)` → `name | null` — per il click/quiz
- `setPlaying(on)` / `setProgress(p)` — comandi della timeline (v12: `playing`, `scrub.value`)
- callback verso React: `onPlagueRegionClick(name)`, `onSceneReady()`, **`onTick(progress, playing, year)`** — l'unico modo in cui lo stato di animazione raggiunge la UI (mai via Redux, vedi §4)

> **`setPresent` NON fa parte di questa interfaccia.** La modalità presentazione non tocca mai il motore: è solo `body.present` gestita da React in `features/present/` a partire da `modeSlice.present`.

`byName(name)` (lookup in `PESTE`) resta un helper dati condiviso da tour, quiz e igCard.

---

## Invarianti da NON rompere (principio d'oro + regole progetto)

1. Coordinate/confini/date solo da historical-basemaps e Wikidata; `pulse` senza coordinate; `territory` senza poligoni.
2. Avviso `lastDataNote` ("verifica prima dell'uso in classe") sempre visibile nella lezione.
3. Niente `localStorage`: Salva/Carica via file JSON (blob).
4. three.js **r128** pinnato **esatto** a `0.128.0` (versione esatta in `package.json`, non `^0.128.0`). Se `@types/three` non copre bene r128, aggiungere uno shim `.d.ts` locale minimo invece di alzare la versione o usare `any` diffuso.
5. La chiave API non compare mai nel client: vive solo nel Worker.
