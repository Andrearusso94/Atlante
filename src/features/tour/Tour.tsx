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
}

// v12 (startTour/endTour/advanceSlide/scheduleSlide/tourGoRegion/updateTourBar). Qui
// ogni tappa = una regione di TOUR: niente carosello di sotto-slide dentro la card
// (quello arriva con features/igCard, non ancora costruita — vedi il segnaposto TODO
// più sotto). tourActive/tourIdx/tourPaused vivono in modeSlice (RICOGNIZIONE-v12.md
// §4); il motore non sa nulla del tour, riceve solo flyTo via prop —
// setIdleSpinSuppressed/enablePlague/setBorders restano cablati reattivamente in
// App.tsx a partire da modeSlice (blocco 10): non li richiamiamo qui per non
// duplicare quella logica.
export default function Tour({ onFlyTo }: TourProps) {
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

  // v12 (tourGoRegion): vola sulla regione corrente ogni volta che il tour parte o
  // cambia tappa.
  useEffect(() => {
    if (!tourActive) return;
    const region = byName(TOUR[tourIdx]);
    if (!region) return;
    onFlyTo(region.ll[0], region.ll[1]);
  }, [tourActive, tourIdx, onFlyTo]);

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
  const slide = region?.slides[0];

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
      <button type="button" className={styles.nav} aria-label="Play/Pausa" onClick={handleTogglePause}>
        {tourPaused ? "▶" : "❚❚"}
      </button>
      <button type="button" className={styles.nav} aria-label="Tappa successiva" onClick={() => goRegion(tourIdx + 1)}>
        ›
      </button>
      <div className={styles.id}>
        <div className={styles.label}>{region?.label ?? "—"}</div>
        <div className={styles.step}>
          Tappa {tourIdx + 1} / {TOUR.length}
        </div>
      </div>
      {/* TODO(features/igCard): qui andrà la card Instagram vera (RICOGNIZIONE-v12.md
          §5, carosello di sotto-slide con plate() SVG) — finché non esiste mostriamo
          solo la prima slide della regione come segnaposto, non bloccante. */}
      {slide && (
        <div className={styles.card}>
          <p className={styles.tag}>{slide.tag}</p>
          {/* v12 (#igText.innerHTML=s.text): testo curato a mano con markup minimo
              (<b>), non input utente/IA — stesso livello di fiducia di data/peste.ts. */}
          <p className={styles.text} dangerouslySetInnerHTML={{ __html: slide.text }} />
        </div>
      )}
      <button type="button" className={styles.exit} aria-label="Esci dal tour" onClick={handleExit}>
        ✕
      </button>
    </div>
  );
}
