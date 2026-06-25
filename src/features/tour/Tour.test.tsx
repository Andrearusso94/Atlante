// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import modeReducer, { setBordersOn, setPlagueActive, startQuiz } from "../../store/modeSlice";
import { acquirePlagueOwnership, createPlagueOwnershipState, releasePlagueOwnership } from "../../plagueOwnership";
import { byName, SLIDE_MS, TOUR } from "../../data/peste";
import Tour from "./Tour";

/** Simula il cablaggio reale di App.tsx (acquirePlague/releasePlague su
 * plagueOwnership.ts, ensurePlagueReady che accende bordersOn se serve) ma sullo store
 * di test, senza GlobeEngine — così le asserzioni su bordersOn/plagueActive restano
 * significative senza dover montare three.js. `ensurePlagueReadyResult` permette ai
 * test di simulare un fallimento di rete (v12: `ensurePlagueReady` ritorna `false`). */
function renderTour(preload?: {
  bordersOn?: boolean;
  plagueActive?: boolean;
  quizActive?: boolean;
  ensurePlagueReadyResult?: boolean;
}) {
  const store = configureStore({ reducer: { mode: modeReducer } });
  if (preload?.bordersOn) store.dispatch(setBordersOn(true));
  if (preload?.plagueActive) store.dispatch(setPlagueActive(true));
  if (preload?.quizActive) store.dispatch(startQuiz([0]));
  const onFlyTo = vi.fn();
  const onOpenIgCard = vi.fn();
  const ownership = createPlagueOwnershipState();

  const onAcquirePlague = vi.fn(() => {
    const { claimedPlague } = acquirePlagueOwnership(ownership, store.getState().mode);
    if (claimedPlague) store.dispatch(setPlagueActive(true));
  });
  const onReleasePlague = vi.fn(() => {
    const released = releasePlagueOwnership(ownership);
    if (released.plague) store.dispatch(setPlagueActive(false));
    if (released.borders) store.dispatch(setBordersOn(false));
  });
  const onEnsurePlagueReady = vi.fn(async () => {
    if (preload?.ensurePlagueReadyResult === false) return false;
    if (!store.getState().mode.bordersOn) store.dispatch(setBordersOn(true));
    return true;
  });

  render(
    <Provider store={store}>
      <Tour
        onFlyTo={onFlyTo}
        onOpenIgCard={onOpenIgCard}
        onEnsurePlagueReady={onEnsurePlagueReady}
        onAcquirePlague={onAcquirePlague}
        onReleasePlague={onReleasePlague}
      />
    </Provider>,
  );
  return { store, onFlyTo, onOpenIgCard, onEnsurePlagueReady, onAcquirePlague, onReleasePlague };
}

async function clickStart() {
  await act(async () => {
    fireEvent.click(screen.getByText("🎬 Tour guidato"));
  });
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

  it("avvio: attende ensurePlagueReady, poi attiva il tour, forza confini+peste (se non già attivi), vola sulla prima regione e apre la sua card", async () => {
    const { store, onFlyTo, onOpenIgCard, onEnsurePlagueReady } = renderTour();

    await clickStart();

    expect(onEnsurePlagueReady).toHaveBeenCalledTimes(1);
    expect(store.getState().mode).toMatchObject({
      tourActive: true,
      tourIdx: 0,
      tourPaused: false,
      bordersOn: true,
      plagueActive: true,
    });
    const france = byName(TOUR[0])!;
    expect(onFlyTo).toHaveBeenCalledWith(france.ll[0], france.ll[1]);
    expect(onOpenIgCard).toHaveBeenCalledWith(TOUR[0]);
    screen.getByText("Francia");
    screen.getByText(`Tappa 1 / ${TOUR.length}`);
  });

  it("se ensurePlagueReady fallisce, non attiva il tour (v12: niente mappa del 1300, niente tour)", async () => {
    const { store, onFlyTo } = renderTour({ ensurePlagueReadyResult: false });

    await clickStart();

    expect(store.getState().mode.tourActive).toBe(false);
    expect(onFlyTo).not.toHaveBeenCalled();
    screen.getByText("🎬 Tour guidato");
  });

  it("esclusione reciproca: avviare il tour mentre il quiz è attivo lo chiude", async () => {
    const { store } = renderTour({ quizActive: true });

    await clickStart();

    expect(store.getState().mode.quizActive).toBe(false);
    expect(store.getState().mode.tourActive).toBe(true);
  });

  it("Esc chiude il tour (v12 riga 1103) e ripristina confini/peste come l'uscita manuale", async () => {
    const { store } = renderTour();
    await clickStart();
    expect(store.getState().mode.tourActive).toBe(true);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().mode).toMatchObject({
      tourActive: false,
      bordersOn: false,
      plagueActive: false,
    });
  });

  it("avanza automaticamente ogni SLIDE_MS alla tappa successiva, volandoci e aprendo la sua card", async () => {
    const { store, onFlyTo, onOpenIgCard } = renderTour();
    await clickStart();
    onFlyTo.mockClear();
    onOpenIgCard.mockClear();

    advance(SLIDE_MS);

    expect(store.getState().mode.tourIdx).toBe(1);
    expect(onOpenIgCard).toHaveBeenCalledWith(TOUR[1]);
    const england = byName(TOUR[1])!;
    expect(onFlyTo).toHaveBeenCalledWith(england.ll[0], england.ll[1]);
  });

  it("pausa ferma il timer; la ripresa lo riavvia con SLIDE_MS pieno (porta fedele del v12)", async () => {
    const { store } = renderTour();
    await clickStart();

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

  it("tappa successiva/precedente naviga con wrap circolare e toglie la pausa", async () => {
    const { store } = renderTour();
    await clickStart();

    fireEvent.click(screen.getByLabelText("Tappa precedente"));
    expect(store.getState().mode.tourIdx).toBe(TOUR.length - 1);
    expect(store.getState().mode.tourPaused).toBe(false);

    fireEvent.click(screen.getByLabelText("Tappa successiva"));
    expect(store.getState().mode.tourIdx).toBe(0);
  });

  it("alla fine del tour esce da sola e ripristina confini/peste se li aveva accesi lei", async () => {
    const { store } = renderTour();
    await clickStart();

    for (let i = 0; i < TOUR.length - 1; i++) advance(SLIDE_MS);
    expect(store.getState().mode.tourIdx).toBe(TOUR.length - 1);
    expect(store.getState().mode.tourActive).toBe(true);

    advance(SLIDE_MS);

    expect(store.getState().mode).toMatchObject({
      tourActive: false,
      bordersOn: false,
      plagueActive: false,
    });
  });

  it("non disattiva confini/peste all'uscita se erano già attivi prima del tour", async () => {
    const { store } = renderTour({ bordersOn: true, plagueActive: true });
    await clickStart();

    fireEvent.click(screen.getByLabelText("Esci dal tour"));

    expect(store.getState().mode).toMatchObject({
      tourActive: false,
      bordersOn: true,
      plagueActive: true,
    });
  });

  it("l'uscita manuale ferma il timer: il tempo che passa dopo non muove più nulla", async () => {
    const { store, onFlyTo } = renderTour();
    await clickStart();
    fireEvent.click(screen.getByLabelText("Esci dal tour"));
    onFlyTo.mockClear();

    advance(SLIDE_MS * 2);

    expect(onFlyTo).not.toHaveBeenCalled();
    expect(store.getState().mode.tourActive).toBe(false);
  });
});
