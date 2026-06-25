import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, vi } from "vitest";
import modeReducer from "../../store/modeSlice";
import type { GlobeEngine } from "../../engine/GlobeEngine";
import { resetTimelineOnSceneReady } from "./resetOnSceneReady";

function makeStore() {
  return configureStore({ reducer: { mode: modeReducer } });
}

/** Motore finto: copre solo setProgress/setPlaying, le due chiamate che
 * resetTimelineOnSceneReady usa — niente three.js. */
function makeEngine() {
  const calls: string[] = [];
  return {
    engine: {
      setProgress: vi.fn(() => calls.push("setProgress")),
      setPlaying: vi.fn(() => calls.push("setPlaying")),
    } as unknown as GlobeEngine,
    calls,
  };
}

describe("resetTimelineOnSceneReady", () => {
  it("v12 riga 529: azzera il progress e riavvia il play, sia nel motore che nello store", () => {
    const store = makeStore();
    const { engine } = makeEngine();

    resetTimelineOnSceneReady({ engine, dispatch: store.dispatch });

    expect(engine.setProgress).toHaveBeenCalledWith(0);
    expect(engine.setPlaying).toHaveBeenCalledWith(true);
    expect(store.getState().mode.playing).toBe(true);
  });

  it("chiama setProgress(0) PRIMA di setPlaying(true): setProgress ferma sempre il play (engine/loop.ts)", () => {
    const store = makeStore();
    const { engine, calls } = makeEngine();

    resetTimelineOnSceneReady({ engine, dispatch: store.dispatch });

    expect(calls).toEqual(["setProgress", "setPlaying"]);
  });
});
