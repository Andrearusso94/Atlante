// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import modeReducer from "../../store/modeSlice";
import Present from "./Present";

function renderPresent() {
  const store = configureStore({ reducer: { mode: modeReducer } });
  render(
    <Provider store={store}>
      <Present />
    </Provider>,
  );
  return store;
}

afterEach(() => {
  cleanup();
  document.body.classList.remove("present");
});

describe("Present", () => {
  it("a riposo: bottone 'Presentazione', non premuto, body senza la classe present", () => {
    renderPresent();
    const btn = screen.getByRole("button", { name: "🖥 Presentazione" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(document.body.classList.contains("present")).toBe(false);
  });

  it("click: dispatcha setPresent(true), applica body.present ed etichetta passa a 'Esci'", () => {
    const store = renderPresent();

    fireEvent.click(screen.getByRole("button", { name: "🖥 Presentazione" }));

    expect(store.getState().mode.present).toBe(true);
    expect(document.body.classList.contains("present")).toBe(true);
    const btn = screen.getByRole("button", { name: "🖥 Esci" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("secondo click: esce, rimuove body.present e l'etichetta torna 'Presentazione'", () => {
    const store = renderPresent();
    fireEvent.click(screen.getByRole("button", { name: "🖥 Presentazione" }));

    fireEvent.click(screen.getByRole("button", { name: "🖥 Esci" }));

    expect(store.getState().mode.present).toBe(false);
    expect(document.body.classList.contains("present")).toBe(false);
    screen.getByRole("button", { name: "🖥 Presentazione" });
  });

  it("Esc esce dalla presentazione (porta fedele del v12, riga 1105)", () => {
    const store = renderPresent();
    fireEvent.click(screen.getByRole("button", { name: "🖥 Presentazione" }));

    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().mode.present).toBe(false);
    expect(document.body.classList.contains("present")).toBe(false);
  });

  it("Esc a riposo non fa nulla (nessun dispatch, nessuna classe da rimuovere)", () => {
    const store = renderPresent();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().mode.present).toBe(false);
    expect(document.body.classList.contains("present")).toBe(false);
  });
});
