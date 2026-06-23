import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  endTour,
  selectBordersOn,
  selectPlagueActive,
  selectTour,
  setBordersOn,
  setPlagueActive,
  setTourIdx,
  setTourPaused,
  startTour,
} from "../../store/modeSlice";
import { byName, SLIDE_MS, TOUR } from "../../data/peste";
import styles from "./Tour.module.css";

export interface TourProps {
  /** Comando al motore (GlobeEngine.flyTo) — l'istanza vive in App.tsx, come in
   * features/timeline/ per setPlaying/setProgress. Il motore non sa nulla del tour. */
  onFlyTo: (lat: number, lon: number) => void;
  /** Apre la card Instagram (features/igCard) per la tappa corrente — stesso prop
   * pattern di onFlyTo, l'istanza della card vive in App.tsx. */
  onOpenIgCard: (name: string) => void;
}

// v12 (startTour/endTour/advanceSlide/scheduleSlide/tourGoRegion/updateTourBar). Qui
// ogni tappa = una regione di TOUR: niente timer per sotto-slide dentro la card, il
// rullino di features/igCard si naviga a mano (prev/next/swipe/tastiera) mentre il
// timer del Tour avanza comunque alla regione successiva ogni SLIDE_MS. tourActive/
// tourIdx/tourPaused vivono in modeSlice (RICOGNIZIONE-v12.md §4); il motore non sa
// nulla del tour, riceve solo flyTo via prop — setIdleSpinSuppressed/enablePlague/
// setBorders restano cablati reattivamente in App.tsx a partire da modeSlice (blocco
// 10): non li richiamiamo qui per non duplicare quella logica.
export default function Tour({ onFlyTo, onOpenIgCard }: TourProps) {
  const dispatch = useAppDispatch();
  const { active: tourActive, idx: tourIdx, paused: tourPaused } = useAppSelector(selectTour);
  const bordersOn = useAppSelector(selectBordersOn);
  const plagueActive = useAppSelector(selectPlagueActive);

  // v12 lasciava bordersOn/plagueActive accesi dopo il tour; qui invece "ripristina lo
  // stato dei confini precedente" — quindi teniamo a mente se siamo stati noi ad
  // accenderli, per spegnerli solo in quel caso all'uscita. Bookkeeping effimero della
  // singola sessione di tour: non vive in Redux (sparisce con endTour), come
  // origin/fallbackNotice in features/lesson/.
  const ownedBordersRef = useRef(false);
  const ownedPlagueRef = useRef(false);

  function handleStart() {
    if (tourActive) return;
    ownedBordersRef.current = !bordersOn;
    ownedPlagueRef.current = !plagueActive;
    if (!bordersOn) dispatch(setBordersOn(true));
    if (!plagueActive) dispatch(setPlagueActive(true));
    dispatch(startTour());
  }

  function handleExit() {
    if (ownedPlagueRef.current) dispatch(setPlagueActive(false));
    if (ownedBordersRef.current) dispatch(setBordersOn(false));
    ownedPlagueRef.current = false;
    ownedBordersRef.current = false;
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

  if (!tourActive) {
    return (
      <button type="button" className={styles.launch} onClick={handleStart}>
        🎬 Tour guidato
      </button>
    );
  }

  const region = byName(TOUR[tourIdx]);

  return (
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
    </div>
  );
}
