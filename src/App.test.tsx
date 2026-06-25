// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import specReducer from "./store/specSlice";
import lessonReducer from "./store/lessonSlice";
import modeReducer from "./store/modeSlice";

// mount()/createGlobe() richiedono un vero contesto WebGL, irraggiungibile in jsdom
// (vedi engine/GlobeEngine.test.ts) — qui sostituiamo la classe con uno stub no-op:
// l'obiettivo del test è la composizione di App.tsx, non il motore 3D.
vi.mock("./engine/GlobeEngine", () => ({
  GlobeEngine: class {
    mount() {}
    dispose() {}
    async renderScene() {}
    setTheme() {}
    setBorders() {}
    enablePlague() {}
    setIdleSpinSuppressed() {}
    setPlaying() {}
    setProgress() {}
    flyTo() {}
  },
}));

import App from "./App";

function renderApp() {
  const store = configureStore({ reducer: { spec: specReducer, lesson: lessonReducer, mode: modeReducer } });
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App — modale lezione", () => {
  // Bug reale (non solo di stile): Lesson.tsx rende pannello e modale come fratelli
  // nello stesso Fragment. App.tsx li avvolgeva entrambi in <div className={styles.lesson}>,
  // bersaglio della regola body.modal-open che applica filter/opacity/pointer-events —
  // `filter` crea un containing block per i discendenti position:fixed, quindi la modale
  // (position:fixed) finiva imprigionata nel riquadro stretto del pannello (330px) invece
  // di occupare lo schermo, oltre a diventare semi-trasparente e non cliccabile. jsdom non
  // calcola containing block/filter, quindi qui si verifica l'invariante strutturale che
  // evita il bug: la modale deve condividere il genitore con #scene (nessun wrapper
  // intermedio), non essere annidata dentro il pannello.
  it("un click reale su una voce della cronologia (esempio offline Peste) apre la modale, fuori dal wrapper del pannello", async () => {
    renderApp();

    // FALLBACK.peste arriva da un dispatch interno ad App.tsx al mount, non da qui.
    await waitFor(() => screen.getByText("Da Caffa a Messina"));

    fireEvent.click(screen.getByText("Da Caffa a Messina"));

    const dialog = await waitFor(() => screen.getByRole("dialog"));
    screen.getByText(/Lezione di esempio curata a mano\./);
    screen.getByText(/La peste arriva in Europa con le navi genovesi/);

    const scene = screen.getByRole("application", { name: "Globo 3D" });
    const overlay = dialog.parentElement; // .modal (dialog) è dentro .overlay (backdrop)
    expect(overlay?.parentElement).toBe(scene.parentElement);
  });
});
