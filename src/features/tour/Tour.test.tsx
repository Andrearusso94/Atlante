// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import modeReducer, { setBordersOn, setPlagueActive } from "../../store/modeSlice";
import { byName, SLIDE_MS, TOUR } from "../../data/peste";
import Tour from "./Tour";

function renderTour(preload?: { bordersOn?: boolean; plagueActive?: boolean }) {
  const store = configureStore({ reducer: { mode: modeReducer } });
  if (preload?.bordersOn) store.dispatch(setBordersOn(true));
  if (preload?.plagueActive) store.dispatch(setPlagueActive(true));
  const onFlyTo = vi.fn();
  render(
    <Provider store={store}>
      <Tour onFlyTo={onFlyTo} />
    </Provider>,
  );
  return { store, onFlyTo };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Tour", () => {
  it("a riposo mostra solo il pulsante di lancio, nessun flyTo", () => {
    const { onFlyTo } = renderTour();
    screen.getByText("🎬 Tour guidato");
    expect(onFlyTo).not.toHaveBeenCalled();
  });

  it("avvio: attiva tour, forza confini+peste (se non già attivi) e vola sulla prima regione", () => {
    const { store, onFlyTo } = renderTour();

    fireEvent.click(screen.getByText("🎬 Tour guidato"));

    expect(store.getState().mode).toMatchObject({
      tourActive: true,
      tourIdx: 0,
      tourPaused: false,
      bordersOn: true,
      plagueActive: true,
    });
    const france = byName(TOUR[0])!;
    expect(onFlyTo).toHaveBeenCalledWith(france.ll[0], france.ll[1]);
    screen.getByText("Francia");
    screen.getByText(`Tappa 1 / ${TOUR.length}`);
  });

  it("avanza automaticamente ogni SLIDE_MS alla tappa successiva, volandoci", () => {
    const { store, onFlyTo } = renderTour();
    fireEvent.click(screen.getByText("🎬 Tour guidato"));
    onFlyTo.mockClear();

    advance(SLIDE_MS);

    expect(store.getState().mode.tourIdx).toBe(1);
    const england = byName(TOUR[1])!;
    expect(onFlyTo).toHaveBeenCalledWith(england.ll[0], england.ll[1]);
  });

  it("pausa ferma il timer; la ripresa lo riavvia con SLIDE_MS pieno (porta fedele del v12)", () => {
    const { store } = renderTour();
    fireEvent.click(screen.getByText("🎬 Tour guidato"));

    fireEvent.click(screen.getByLabelText("Play/Pausa"));
    expect(store.getState().mode.tourPaused).toBe(true);

    advance(SLIDE_MS);
    expect(store.getState().mode.tourIdx).toBe(0); // ancora fermo in pausa

    fireEvent.click(screen.getByLabelText("Play/Pausa"));
    expect(store.getState().mode.tourPaused).toBe(false);

    advance(SLIDE_MS - 1);
    expect(store.getState().mode.tourIdx).toBe(0); // non ancora: la ripresa riparte da zero

    advance(1);
    expect(store.getState().mode.tourIdx).toBe(1);
  });

  it("tappa successiva/precedente naviga con wrap circolare e toglie la pausa", () => {
    const { store } = renderTour();
    fireEvent.click(screen.getByText("🎬 Tour guidato"));

    fireEvent.click(screen.getByLabelText("Tappa precedente"));
    expect(store.getState().mode.tourIdx).toBe(TOUR.length - 1);
    expect(store.getState().mode.tourPaused).toBe(false);

    fireEvent.click(screen.getByLabelText("Tappa successiva"));
    expect(store.getState().mode.tourIdx).toBe(0);
  });

  it("alla fine del tour esce da sola e ripristina confini/peste se li aveva accesi lei", () => {
    const { store } = renderTour();
    fireEvent.click(screen.getByText("🎬 Tour guidato"));

    for (let i = 0; i < TOUR.length - 1; i++) advance(SLIDE_MS);
    expect(store.getState().mode.tourIdx).toBe(TOUR.length - 1);
    expect(store.getState().mode.tourActive).toBe(true);

    advance(SLIDE_MS);

    expect(store.getState().mode).toMatchObject({ tourActive: false, bordersOn: false, plagueActive: false });
  });

  it("non disattiva confini/peste all'uscita se erano già attivi prima del tour", () => {
    const { store } = renderTour({ bordersOn: true, plagueActive: true });
    fireEvent.click(screen.getByText("🎬 Tour guidato"));

    fireEvent.click(screen.getByLabelText("Esci dal tour"));

    expect(store.getState().mode).toMatchObject({ tourActive: false, bordersOn: true, plagueActive: true });
  });

  it("l'uscita manuale ferma il timer: il tempo che passa dopo non muove più nulla", () => {
    const { store, onFlyTo } = renderTour();
    fireEvent.click(screen.getByText("🎬 Tour guidato"));
    fireEvent.click(screen.getByLabelText("Esci dal tour"));
    onFlyTo.mockClear();

    advance(SLIDE_MS * 2);

    expect(onFlyTo).not.toHaveBeenCalled();
    expect(store.getState().mode.tourActive).toBe(false);
  });
});
