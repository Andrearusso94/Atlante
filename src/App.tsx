import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { GlobeEngine } from "./engine/GlobeEngine";
import type { TickPayload } from "./engine/loop";
import { FALLBACK } from "./data/fallback";
import { selectCurrentSpec, setCurrentSpec } from "./store/specSlice";
import { selectBordersOn, selectPlagueActive, selectTheme } from "./store/modeSlice";
import { routePlagueClick } from "./plagueClickRoute";
import Generator from "./features/generator/Generator";
import Lesson from "./features/lesson/Lesson";
import Controls from "./features/controls/Controls";

// TODO(features/quiz): la feature non esiste ancora (RICOGNIZIONE-v12.md §5) — quando
// arriva, collegare qui quizAnswer(name) invece di limitarsi a loggare.
function quizAnswerPlaceholder(name: string): void {
  console.info(`[quiz TODO] risposta tap su "${name}"`);
}

// TODO(features/igCard): la feature "Card Instagram" non esiste ancora
// (RICOGNIZIONE-v12.md §5) — quando arriva, collegare qui openIgCard(name).
function openIgCardPlaceholder(name: string): void {
  console.info(`[igCard TODO] apri card Peste per "${name}"`);
}

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
  const [tick, setTick] = useState<TickPayload | null>(null);

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
      onPlagueRegionClick: (name) => {
        switch (routePlagueClick(modeRef.current)) {
          case "quiz":
            quizAnswerPlaceholder(name);
            break;
          case "igCard":
            openIgCardPlaceholder(name);
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

  useEffect(() => {
    engineRef.current?.enablePlague(plagueActive);
  }, [plagueActive]);

  useEffect(() => {
    engineRef.current?.setIdleSpinSuppressed(tourActive || quizActive);
  }, [tourActive, quizActive]);

  return (
    <div>
      <div ref={containerRef} style={{ position: "fixed", inset: 0 }} />
      <div style={{ position: "relative", zIndex: 1, color: "#fff", padding: 16 }}>
        <h1>Atlante Sincronico</h1>
        <p>Scaffold pronto — tema corrente: {theme}</p>
        {tick && (
          <p>
            anno: {tick.yearLabel} · progress: {tick.progress.toFixed(2)} · playing: {String(tick.playing)}
          </p>
        )}
      </div>
      <div style={{ position: "fixed", left: 16, bottom: 16, zIndex: 1 }}>
        <Generator />
      </div>
      <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 1 }}>
        <Lesson />
      </div>
      <div style={{ position: "fixed", right: 16, top: 16, zIndex: 1 }}>
        <Controls />
      </div>
    </div>
  );
}
