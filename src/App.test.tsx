// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    isPlagueActive() { return false; }
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

describe("App — stabilità callback (issue #5)", () => {
  it("openIgCard mantiene identità stabile tra render: avviare il Tour non genera Maximum update depth exceeded", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderApp();

    await act(async () => {
      fireEvent.click(screen.getByText("🎬 Tour guidato"));
    });

    const loopErrors = errorSpy.mock.calls.filter((args) =>
      String(args[0]).includes("Maximum update depth exceeded"),
    );
    expect(loopErrors).toHaveLength(0);

    errorSpy.mockRestore();
  });
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

  // Bug 3 riportato ("i tasti di chiusura della modalità presentazione non
  // funzionano") era in realtà un sintomo a valle del bug sopra, verificato in un
  // browser reale (Chromium headless): con la modale incollata (Chiudi non
  // cliccabile, vedi test sopra), body.modal-open non veniva mai rimosso — quindi
  // anche dopo un click su "Esci" da Presentazione (che TOGLIE correttamente
  // body.present), lo schermo restava dimmed/sfocato per colpa della classe
  // modal-open ancora attaccata, e sembrava che "chiudere" non avesse fatto nulla.
  // Qui si blocca l'intera sequenza: apri la modale, chiudila, entra/esci dalla
  // presentazione — alla fine il body non deve avere NESSUNA classe residua.
  it("modale lezione chiusa correttamente + presentazione: nessuna classe residua su body alla fine", async () => {
    renderApp();
    await waitFor(() => screen.getByText("Da Caffa a Messina"));

    fireEvent.click(screen.getByText("Da Caffa a Messina"));
    await waitFor(() => screen.getByRole("dialog"));
    expect(document.body.classList.contains("modal-open")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(document.body.classList.contains("modal-open")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "🖥 Presentazione" }));
    expect(document.body.classList.contains("present")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "🖥 Esci" }));
    expect(document.body.className).toBe("");
  });
});
