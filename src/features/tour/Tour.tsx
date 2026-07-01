import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { endQuiz, endTour, selectTour, setTourIdx, setTourPaused, startTour } from "../../store/modeSlice";
import { byName, SLIDE_MS, TOUR } from "../../data/peste";
import styles from "./Tour.module.css";

export interface TourProps {
  /** Comando al motore (GlobeEngine.flyTo) — l'istanza vive in App.tsx, come in
   * features/timeline/ per setPlaying/setProgress. Il motore non sa nulla del tour. */
  onFlyTo: (lat: number, lon: number) => void;
  /** Apre la card Instagram (features/igCard) per la tappa corrente — stesso prop
   * pattern di onFlyTo, l'istanza della card vive in App.tsx. */
  onOpenIgCard: (name: string) => void;
  /** features/plague/ensurePlagueReady, legato a engine+dispatch+bordersOn in App.tsx —
   * va atteso PRIMA di attivare il tour (v12 righe 1025-1027). */
  onEnsurePlagueReady: () => Promise<boolean>;
  /** Prende possesso di bordersOn/plagueActive se non già accesi (mutua esclusione
   * Tour/Quiz, RICOGNIZIONE-v12.md §5) — implementato in App.tsx su plagueOwnership.ts,
   * condiviso con Quiz: chi parte per primo possiede, chi subentra trova già posseduto. */
  onAcquirePlague: () => void;
  /** Rilascia bordersOn/plagueActive se posseduti da questa sessione (v12 li lascia
   * accesi per sempre; qui si ripristina lo stato precedente — decisione presa). */
  onReleasePlague: () => void;
}

// v12 (startTour/endTour/advanceSlide/scheduleSlide/tourGoRegion/updateTourBar). Qui
// ogni tappa = una regione di TOUR: niente timer per sotto-slide dentro la card, il
// rullino di features/igCard si naviga a mano (prev/next/swipe/tastiera) mentre il
// timer del Tour avanza comunque alla regione successiva ogni SLIDE_MS. tourActive/
// tourIdx/tourPaused vivono in modeSlice (RICOGNIZIONE-v12.md §4); il motore non sa
// nulla del tour, riceve solo flyTo via prop — setIdleSpinSuppressed/enablePlague/
// setBorders restano cablati reattivamente in App.tsx a partire da modeSlice (blocco
// 10): non li richiamiamo qui per non duplicare quella logica.
export default function Tour({
  onFlyTo,
  onOpenIgCard,
  onEnsurePlagueReady,
  onAcquirePlague,
  onReleasePlague,
}: TourProps) {
  const dispatch = useAppDispatch();
  const { active: tourActive, idx: tourIdx, paused: tourPaused } = useAppSelector(selectTour);
  const quizActive = useAppSelector((state) => state.mode.quizActive);

  async function handleStart() {
    if (tourActive) return;
    // v12 riga 1023: avviare il tour chiude il quiz (esclusione reciproca) — il
    // ripristino di bordersOn/plagueActive eventualmente posseduti dal quiz resta
    // compito di plagueOwnership.ts (onAcquirePlague subito sotto), non di endQuiz qui.
    if (quizActive) dispatch(endQuiz());
    onAcquirePlague();
    const ok = await onEnsurePlagueReady();
    if (!ok) return;
    dispatch(startTour());
  }

  function handleExit() {
    onReleasePlague();
    dispatch(endTour());
  }

  // v12 (tourPrev/tourNext): wrap circolare su TOUR, e la navigazione manuale toglie
  // sempre la pausa.
  function goRegion(i: number) {
    dispatch(setTourPaused(false));
    dispatch(setTourIdx((i + TOUR.length) % TOUR.length));
  }

  function handleTogglePause() {
    dispatch(setTourPaused(!tourPaused));
  }

  // v12 (tourGoRegion): vola sulla regione corrente e apre la sua card Instagram ogni
  // volta che il tour parte o cambia tappa.
  useEffect(() => {
    if (!tourActive) return;
    const region = byName(TOUR[tourIdx]);
    if (!region) return;
    onFlyTo(region.ll[0], region.ll[1]);
    onOpenIgCard(region.name);
  }, [tourActive, tourIdx, onFlyTo, onOpenIgCard]);

  // v12 (scheduleSlide/advanceSlide/clearTourTimer): un timer per tappa. La pausa lo
  // ferma (cleanup, niente nuovo setTimeout); la ripresa lo riavvia con SLIDE_MS pieno,
  // esattamente come nel v12 (non riparte dal tempo residuo). In fondo al TOUR esce da
  // sola.
  useEffect(() => {
    if (!tourActive || tourPaused) return;
    const timer = window.setTimeout(() => {
      if (tourIdx < TOUR.length - 1) dispatch(setTourIdx(tourIdx + 1));
      else handleExit();
    }, SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [tourActive, tourPaused, tourIdx]);

  // v12 (Esc globale, riga 1103: `if(tourActive){endTour();return;}`) — qui come listener
  // proprio del Tour, condizionato/staccato su tourActive (stesso pattern di Esc-per-modale
  // in features/lesson/Lesson.tsx e features/igCard/IgCard.tsx). Mai insieme al Quiz: con
  // l'esclusione reciproca sopra, al più uno dei due è attivo.
  useEffect(() => {
    if (!tourActive) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleExit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tourActive]);

  if (!tourActive) {
    return (
      <button type="button" className={styles.launch} onClick={() => void handleStart()}>
        🎬 Tour guidato
      </button>
    );
  }

  const region = byName(TOUR[tourIdx]);

  // La barra viene portata su document.body tramite portal per uscire dalla catena di
  // transform del contenitore .tools (App.module.css), che intrappola position:fixed e
  // causa il doppio bug: barra fuori asse nel tour normale e sovrapposta alla card in
  // modalità presentazione (issue #7).
  return createPortal(
    <div className={styles.bar} role="group" aria-label="Tour guidato">
      <button
        type="button"
        className={styles.nav}
        aria-label="Tappa precedente"
        onClick={() => goRegion(tourIdx - 1)}
      >
        ‹
      </button>
      <button
        type="button"
        className={styles.nav}
        aria-label="Play/Pausa"
        onClick={handleTogglePause}
      >
        {tourPaused ? "▶" : "❚❚"}
      </button>
      <button
        type="button"
        className={styles.nav}
        aria-label="Tappa successiva"
        onClick={() => goRegion(tourIdx + 1)}
      >
        ›
      </button>
      <div className={styles.id}>
        <div className={styles.label}>{region?.label ?? "—"}</div>
        <div className={styles.step}>
          Tappa {tourIdx + 1} / {TOUR.length}
        </div>
      </div>
      <button type="button" className={styles.exit} aria-label="Esci dal tour" onClick={handleExit}>
        ✕
      </button>
    </div>,
    document.body,
  );
}
