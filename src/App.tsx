import { useEffect, useRef } from "react";
import { useAppSelector } from "./store/hooks";
import { GlobeEngine } from "./engine/GlobeEngine";

// Placeholder di scaffold: il guscio toolbox "Aula" e il coordinatore del click globo
// arrivano con le feature. Qui solo il mount/dispose minimo di GlobeEngine (blocco 5) —
// store/Redux non sono ancora collegati al motore di proposito.
export default function App() {
  const theme = useAppSelector((state) => state.mode.theme);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const engine = new GlobeEngine();
    engine.mount(container);
    return () => engine.dispose();
  }, []);

  return (
    <div>
      <div ref={containerRef} style={{ position: "fixed", inset: 0 }} />
      <div style={{ position: "relative", zIndex: 1, color: "#fff", padding: 16 }}>
        <h1>Atlante Sincronico</h1>
        <p>Scaffold pronto — tema corrente: {theme}</p>
      </div>
    </div>
  );
}
