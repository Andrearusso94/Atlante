// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import modeReducer from "../../store/modeSlice";
import Controls from "./Controls";

function renderControls() {
  const store = configureStore({ reducer: { mode: modeReducer } });
  render(
    <Provider store={store}>
      <Controls />
    </Provider>,
  );
  return store;
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

  it("riflette lo stato iniziale dello store: tema 'day' premuto, confini spenti", () => {
    renderControls();
    expect((screen.getByTitle("Giorno") as HTMLButtonElement).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByTitle("Crepuscolo") as HTMLButtonElement).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: /Confini reali dell'epoca/ }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("click su un tema dispatcha setTheme e aggiorna lo stato premuto", () => {
    const store = renderControls();

    fireEvent.click(screen.getByTitle("Notte"));

    expect(store.getState().mode.theme).toBe("night");
    expect(screen.getByTitle("Notte").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTitle("Giorno").getAttribute("aria-pressed")).toBe("false");
  });

  it("click sul toggle confini dispatcha setBordersOn e lo stato si aggiorna in entrambe le direzioni", () => {
    const store = renderControls();
    const toggle = screen.getByRole("button", { name: /Confini reali dell'epoca/ });

    fireEvent.click(toggle);
    expect(store.getState().mode.bordersOn).toBe(true);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(toggle);
    expect(store.getState().mode.bordersOn).toBe(false);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("non chiama mai GlobeEngine: dispatcha solo azioni di modeSlice (nessun side-effect motore qui)", () => {
    const store = renderControls();

    fireEvent.click(screen.getByTitle("Crepuscolo"));
    fireEvent.click(screen.getByRole("button", { name: /Confini reali dell'epoca/ }));

    expect(store.getState().mode).toMatchObject({ theme: "term", bordersOn: true });
  });
});
