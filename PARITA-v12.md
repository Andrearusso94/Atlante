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

## Blocchi non ancora passati in rassegna

Elenco di partenza per i prossimi blocchi (stesso metodo: confronto riga v12 ↔ file
React, tabella, stato):

- Animazione di ingresso `#overlay`/`#modal` (righe ~75-90: `translateX(40px) scale(.97) opacity:0` → `none`/`1`) — il CSS esiste già in `Lesson.module.css`/`IgCard.module.css`, da confermare riga per riga.
- Tour (`startTour/endTour/advanceSlide/scheduleSlide/updateTourBar/tourGoRegion`).
- Quiz (`startQuiz/quizShow/quizAnswer/quizEnd/quizExit`).
- Generatore (`#q`, chips, `onGenerate`, stato `busy`).
- Controlli (`#themeBox`, `bToggle`).
- Timeline (`#play`, `#scrub`, `#curYear`).
