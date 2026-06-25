import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, vi } from "vitest";
import modeReducer, { setBordersOn, setPlaying } from "../../store/modeSlice";
import specReducer from "../../store/specSlice";
import { FALLBACK } from "../../data/fallback";
import type { GlobeEngine } from "../../engine/GlobeEngine";
import { ensurePlagueReady } from "./ensurePlagueReady";

function makeStore() {
  return configureStore({ reducer: { mode: modeReducer, spec: specReducer } });
}

/** Motore finto: copre solo l'interfaccia pubblica che ensurePlagueReady usa
 * (renderScene/setPlaying/setBorders/setYear/isPlagueActive) — niente three.js. */
function makeEngine(opts?: { isPlagueActiveSequence?: boolean[]; renderSceneError?: Error; setYearError?: Error }) {
  const sequence = opts?.isPlagueActiveSequence ?? [false, true];
  let call = 0;
  return {
    isPlagueActive: vi.fn(() => sequence[Math.min(call++, sequence.length - 1)]),
    renderScene: vi.fn(async () => {
      if (opts?.renderSceneError) throw opts.renderSceneError;
    }),
    setPlaying: vi.fn(),
    setBorders: vi.fn(),
    setYear: vi.fn(async () => {
      if (opts?.setYearError) throw opts.setYearError;
    }),
  } as unknown as GlobeEngine;
}

describe("ensurePlagueReady", () => {
  it("guardia iniziale: se la peste è già attiva, ritorna true subito senza toccare scena/confini", async () => {
    const store = makeStore();
    const engine = makeEngine({ isPlagueActiveSequence: [true] });

    const ok = await ensurePlagueReady({ engine, dispatch: store.dispatch, bordersOn: false });

    expect(ok).toBe(true);
    expect(engine.renderScene).not.toHaveBeenCalled();
    expect(engine.setYear).not.toHaveBeenCalled();
    expect(store.getState().spec.currentSpec).toBeNull();
  });

  it("flusso normale: carica FALLBACK.peste come scena corrente, ferma il play, accende i confini (erano spenti) e forza il 1349", async () => {
    const store = makeStore();
    const engine = makeEngine();

    const ok = await ensurePlagueReady({ engine, dispatch: store.dispatch, bordersOn: false });

    expect(ok).toBe(true);
    expect(store.getState().spec.currentSpec).toBe(FALLBACK.peste);
    expect(engine.renderScene).toHaveBeenCalledWith(FALLBACK.peste);
    expect(store.getState().mode.playing).toBe(false);
    expect(engine.setPlaying).toHaveBeenCalledWith(false);
    expect(store.getState().mode.bordersOn).toBe(true);
    expect(engine.setBorders).toHaveBeenCalledWith(true);
    expect(engine.setYear).toHaveBeenCalledWith(1349);
  });

  it("se i confini erano già accesi, non li ritocca (v12: if(!bordersOn){...})", async () => {
    const store = makeStore();
    store.dispatch(setBordersOn(true));
    const engine = makeEngine();

    await ensurePlagueReady({ engine, dispatch: store.dispatch, bordersOn: true });

    expect(engine.setBorders).not.toHaveBeenCalled();
  });

  it("ritorna lo stato VERO di attivazione, non un true fisso: se i confini del 1300 non si caricano resta false", async () => {
    const store = makeStore();
    const engine = makeEngine({ isPlagueActiveSequence: [false, false] });

    const ok = await ensurePlagueReady({ engine, dispatch: store.dispatch, bordersOn: false });

    expect(ok).toBe(false);
  });

  it("inghiotte gli errori di renderScene/setYear come il v12 (try/catch silenziosi) e ritorna comunque l'esito vero", async () => {
    const store = makeStore();
    const engine = makeEngine({
      isPlagueActiveSequence: [false, true],
      renderSceneError: new Error("rete assente"),
      setYearError: new Error("confini non disponibili"),
    });

    await expect(ensurePlagueReady({ engine, dispatch: store.dispatch, bordersOn: false })).resolves.toBe(true);
  });

  it("se un play era in corso, lo ferma sia nello store che nel motore (v12: playing=false + icona ▶)", async () => {
    const store = makeStore();
    store.dispatch(setPlaying(true));
    const engine = makeEngine();

    await ensurePlagueReady({ engine, dispatch: store.dispatch, bordersOn: false });

    expect(store.getState().mode.playing).toBe(false);
    expect(engine.setPlaying).toHaveBeenCalledWith(false);
  });
});
