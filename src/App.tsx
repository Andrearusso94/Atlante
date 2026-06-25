import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { GlobeEngine } from "./engine/GlobeEngine";
import type { TickPayload } from "./engine/loop";
import { FALLBACK } from "./data/fallback";
import { selectCurrentSpec, setCurrentSpec } from "./store/specSlice";
import { selectBordersOn, selectPlagueActive, selectTheme, setBordersOn, setPlagueActive } from "./store/modeSlice";
import { routePlagueClick } from "./plagueClickRoute";
import { acquirePlagueOwnership, createPlagueOwnershipState, releasePlagueOwnership } from "./plagueOwnership";
import { ensurePlagueReady } from "./features/plague/ensurePlagueReady";
import { resetTimelineOnSceneReady } from "./features/timeline/resetOnSceneReady";
import Generator from "./features/generator/Generator";
import Lesson from "./features/lesson/Lesson";
import Controls from "./features/controls/Controls";
import Timeline from "./features/timeline/Timeline";
import Tour from "./features/tour/Tour";
import Quiz, { type QuizClick } from "./features/quiz/Quiz";
import IgCard, { type IgCardOpen } from "./features/igCard/IgCard";
import Present from "./features/present/Present";
import styles from "./App.module.css";

// Cablaggio centrale store Redux <-> GlobeEngine (blocco 10). Vive in App.tsx perché il
// coordinatore del click sul globo deve conoscere insieme lo stato di più feature
// (tour/quiz) e l'istanza di GlobeEngine (RICOGNIZIONE-v12.md §5). Nessun oggetto
// three.js entra nello store; lo stato di animazione (progress/playing/anno) arriva
// solo via onTick e resta in stato locale React, mai in Redux (RICOGNIZIONE-v12.md §4).
export default function App() {
  const dispatch = useAppDispatch();
  const currentSpec = useAppSelector(selectCurrentSpec);
  const theme = useAppSelector(selectTheme);
  const bordersOn = useAppSelector(selectBordersOn);
  const plagueActive = useAppSelector(selectPlagueActive);
  const tourActive = useAppSelector((state) => state.mode.tourActive);
  const quizActive = useAppSelector((state) => state.mode.quizActive);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GlobeEngine | null>(null);
  const modeRef = useRef({ tourActive, quizActive });
  const quizClickSeqRef = useRef(0);
  const igCardSeqRef = useRef(0);
  const [tick, setTick] = useState<TickPayload | null>(null);
  const [quizClick, setQuizClick] = useState<QuizClick | null>(null);
  const [igCardOpen, setIgCardOpen] = useState<IgCardOpen | null>(null);
  // v12: testo di #bEra. Come progress/playing/anno (onTick), arriva dal motore via
  // callback e resta in stato locale React — mai in Redux (RICOGNIZIONE-v12.md §4).
  const [bordersEra, setBordersEra] = useState("");
  // Possesso condiviso di bordersOn/plagueActive fra Tour e Quiz (plagueOwnership.ts) —
  // UNA sola istanza qui perché sono in esclusione reciproca (blocco mutua esclusione):
  // chi parte per primo possiede, chi subentra trova già posseduto, chi esce per ultimo
  // rilascia. v12 non aveva questo concetto (li lasciava accesi per sempre).
  const plagueOwnershipRef = useRef(createPlagueOwnershipState());

  // Prende possesso di bordersOn/plagueActive se non già accesi, prima che Tour/Quiz
  // chiamino ensurePlagueReady (che accende bordersOn da solo se serve, vedi sotto) —
  // qui si accende subito SOLO plagueActive, l'unico flag che nessun'altra funzione
  // attiva da sé.
  function acquirePlague() {
    const { claimedPlague } = acquirePlagueOwnership(plagueOwnershipRef.current, { bordersOn, plagueActive });
    if (claimedPlague) dispatch(setPlagueActive(true));
  }

  // Rilascia bordersOn/plagueActive se posseduti da questa sessione (Tour o Quiz, a
  // chiusura) — v12 li lasciava accesi per sempre; qui si ripristina lo stato precedente.
  function releasePlague() {
    const released = releasePlagueOwnership(plagueOwnershipRef.current);
    if (released.plague) dispatch(setPlagueActive(false));
    if (released.borders) dispatch(setBordersOn(false));
  }

  // features/plague/ensurePlagueReady, legata all'istanza di GlobeEngine che vive qui —
  // stesso prop pattern di onFlyTo/onSetPlaying. `bordersOn` è quello dell'ultimo render:
  // niente fra acquirePlague() e questa chiamata dispatcha bordersOn, quindi resta accurato.
  async function handleEnsurePlagueReady(): Promise<boolean> {
    const engine = engineRef.current;
    if (!engine) return false;
    return ensurePlagueReady({ engine, dispatch, bordersOn });
  }

  // GlobeEngine.onSceneReady (v12 riga 529): ogni scena nuova riparte da zero e si
  // avvia da sola — features/timeline/resetOnSceneReady.ts.
  function handleSceneReady() {
    const engine = engineRef.current;
    if (!engine) return;
    resetTimelineOnSceneReady({ engine, dispatch });
  }

  // Apre la card Instagram (features/igCard) per la regione `name` — chiamata sia dal
  // coordinatore del click sul globo qui sotto, sia dalle tappe del Tour (prop
  // onOpenIgCard). `seq` distingue due aperture sulla stessa regione di fila, stesso
  // pattern di quizClickSeqRef/setQuizClick.
  function openIgCard(name: string) {
    igCardSeqRef.current += 1;
    setIgCardOpen({ name, seq: igCardSeqRef.current });
  }

  // Letta dal coordinatore del click (closure stabile creata una sola volta in mount()):
  // un ref evita di dover ricreare GlobeEngine ad ogni cambio di tour/quiz.
  useEffect(() => {
    modeRef.current = { tourActive, quizActive };
  }, [tourActive, quizActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const engine = new GlobeEngine({
      onTick: setTick,
      onSceneReady: handleSceneReady,
      onBordersEraChange: setBordersEra,
      onPlagueRegionClick: (name) => {
        switch (routePlagueClick(modeRef.current)) {
          case "quiz":
            quizClickSeqRef.current += 1;
            setQuizClick({ name, seq: quizClickSeqRef.current });
            break;
          case "igCard":
            openIgCard(name);
            break;
          case "tour":
            break; // v12: durante un tour il tap non fa nulla
        }
      },
    });
    engine.mount(container);
    engineRef.current = engine;

    // Scena di prova per verificare il cablaggio store -> motore: "spread" (Peste) non
    // richiede rete (a differenza di pulse/territory, niente Wikidata/CDN confini).
    dispatch(setCurrentSpec(FALLBACK.peste));

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [dispatch]);

  useEffect(() => {
    if (currentSpec) void engineRef.current?.renderScene(currentSpec);
  }, [currentSpec]);

  useEffect(() => {
    engineRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    engineRef.current?.setBorders(bordersOn);
  }, [bordersOn]);

  // v12 (bToggle off, righe 688): spegnendo i confini, #bEra torna stringa vuota — a
  // differenza degli altri due stati (righe 684/875), questo non arriva mai dal motore
  // via onBordersEraChange (syncPlague/updateBorders non emettono nulla quando i confini
  // sono spenti), va quindi azzerato esplicitamente qui. Il teardown del layer Peste
  // (v12: teardownPlague() nello stesso handler) avviene già da solo nell'effetto sopra
  // (engine.setBorders(false) -> syncPlagueWithBorders -> teardownPlague).
  useEffect(() => {
    if (!bordersOn) setBordersEra("");
  }, [bordersOn]);

  useEffect(() => {
    engineRef.current?.enablePlague(plagueActive);
  }, [plagueActive]);

  useEffect(() => {
    engineRef.current?.setIdleSpinSuppressed(tourActive || quizActive);
  }, [tourActive, quizActive]);

  return (
    <div>
      <div ref={containerRef} id="scene" role="application" aria-label="Globo 3D" />
      <div className={styles.head}>
        <p className="eyebrow">Atlante Sincronico · IA</p>
        <h1>Scrivi la storia, guardala</h1>
        <p className="sub">Scaffold pronto — tema corrente: {theme}</p>
      </div>
      <Lesson />
      <div className={styles.ctrlR}>
        <Controls eraLabel={bordersEra} />
      </div>
      <div className={styles.bottomStack}>
        <Timeline
          tick={tick}
          onSetPlaying={(on) => engineRef.current?.setPlaying(on)}
          onSetProgress={(p) => engineRef.current?.setProgress(p)}
        />
        <Generator />
      </div>
      <div className={styles.tools}>
        <Present />
        <Tour
          onFlyTo={(lat, lon) => engineRef.current?.flyTo(lat, lon)}
          onOpenIgCard={openIgCard}
          onEnsurePlagueReady={handleEnsurePlagueReady}
          onAcquirePlague={acquirePlague}
          onReleasePlague={releasePlague}
        />
        <Quiz
          click={quizClick}
          onFlyTo={(lat, lon) => engineRef.current?.flyTo(lat, lon)}
          onEnsurePlagueReady={handleEnsurePlagueReady}
          onAcquirePlague={acquirePlague}
          onReleasePlague={releasePlague}
        />
      </div>
      <IgCard open={igCardOpen} />
    </div>
  );
}
