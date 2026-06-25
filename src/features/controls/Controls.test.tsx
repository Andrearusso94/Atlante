// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import modeReducer from "../../store/modeSlice";
import Controls from "./Controls";
import styles from "./Controls.module.css";

function renderControls(eraLabel = "") {
  const store = configureStore({ reducer: { mode: modeReducer } });
  const { container } = render(
    <Provider store={store}>
      <Controls eraLabel={eraLabel} />
    </Provider>,
  );
  return { store, container };
}

afterEach(() => {
  cleanup();
});

describe("Controls", () => {
  it("mostra esattamente i 3 temi reali del v12 (day/term/night), nessuno in più", () => {
    renderControls();
    const themeGroup = screen.getByRole("group", { name: "Tema" });
    expect(themeGroup.querySelectorAll("button")).toHaveLength(3);
    screen.getByTitle("Giorno");
    screen.getByTitle("Crepuscolo");
    screen.getByTitle("Notte");
  });

  it("riflette lo stato iniziale dello store: tema 'term' premuto (v12: riga 217), confini spenti", () => {
    renderControls();
    expect((screen.getByTitle("Crepuscolo") as HTMLButtonElement).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByTitle("Giorno") as HTMLButtonElement).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: /Confini reali dell'epoca/ }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("mostra l'etichetta dell'epoca passata da App.tsx (v12: testo di #bEra)", () => {
    renderControls("mappa del mondo: 1500 d.C.");
    screen.getByText("mappa del mondo: 1500 d.C.");
  });

  // v12 (bToggle off, riga 688): #bEra torna stringa vuota — App.tsx lo cablava già
  // come case 1/3 via onBordersEraChange, ma il caso "spento" è azzerato esplicitamente
  // (il motore non emette nulla quando i confini sono spenti). Qui si fissa solo il
  // comportamento di rendering: Controls mostra fedelmente qualunque stringa riceva,
  // vuota compresa — niente testo residuo, niente fallback.
  it("con eraLabel vuota (confini spenti) non mostra alcun testo nell'area epoca", () => {
    const { container } = renderControls("");
    const era = container.querySelector(`.${styles.era}`);
    expect(era).not.toBeNull();
    expect(era!.textContent).toBe("");
  });

  // v12 (syncPlague, riga 875): HTML con span colorato, non solo testo — Controls deve
  // renderizzarlo come markup (dangerouslySetInnerHTML), non come testo letterale con i
  // tag visibili.
  it("con eraLabel HTML (Peste Nera attiva) renderizza il markup, non il testo letterale dei tag", () => {
    const { container } = renderControls(
      'mappa del 1300 · <span style="color:var(--gold-2)">☩ Peste Nera — tocca un territorio</span>',
    );
    const era = container.querySelector(`.${styles.era}`)!;
    expect(era.querySelector("span")).not.toBeNull();
    screen.getByText("☩ Peste Nera — tocca un territorio");
  });

  it("click su un tema dispatcha setTheme e aggiorna lo stato premuto", () => {
    const { store } = renderControls();

    fireEvent.click(screen.getByTitle("Notte"));

    expect(store.getState().mode.theme).toBe("night");
    expect(screen.getByTitle("Notte").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTitle("Giorno").getAttribute("aria-pressed")).toBe("false");
  });

  it("click sul toggle confini dispatcha setBordersOn e lo stato si aggiorna in entrambe le direzioni", () => {
    const { store } = renderControls();
    const toggle = screen.getByRole("button", { name: /Confini reali dell'epoca/ });

    fireEvent.click(toggle);
    expect(store.getState().mode.bordersOn).toBe(true);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(toggle);
    expect(store.getState().mode.bordersOn).toBe(false);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("non chiama mai GlobeEngine: dispatcha solo azioni di modeSlice (nessun side-effect motore qui)", () => {
    const { store } = renderControls();

    fireEvent.click(screen.getByTitle("Crepuscolo"));
    fireEvent.click(screen.getByRole("button", { name: /Confini reali dell'epoca/ }));

    expect(store.getState().mode).toMatchObject({ theme: "term", bordersOn: true });
  });
});
