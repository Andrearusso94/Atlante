// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import modeReducer, { setPlaying } from "../../store/modeSlice";
import type { TickPayload } from "../../engine/loop";
import Timeline from "./Timeline";

function renderTimeline(tick: TickPayload | null, preloadedPlaying?: boolean) {
  const store = configureStore({ reducer: { mode: modeReducer } });
  if (preloadedPlaying !== undefined) store.dispatch(setPlaying(preloadedPlaying));
  const onSetPlaying = vi.fn();
  const onSetProgress = vi.fn();
  render(
    <Provider store={store}>
      <Timeline tick={tick} onSetPlaying={onSetPlaying} onSetProgress={onSetProgress} />
    </Provider>,
  );
  return { store, onSetPlaying, onSetProgress };
}

afterEach(() => {
  cleanup();
});

describe("Timeline", () => {
  it("senza tick mostra lo stato di riposo del v12: ▶, anno '—', scrub a 0", () => {
    renderTimeline(null);
    screen.getByText("▶");
    screen.getByText("—");
    expect((screen.getByLabelText("Avanzamento") as HTMLInputElement).value).toBe("0");
  });

  it("riceve progress/playing/yearLabel SOLO dal tick (props), mai da modeSlice", () => {
    // mode.playing=true nello store, ma il tick dice playing:false — deve vincere il tick.
    renderTimeline({ progress: 0.2, playing: false, yearLabel: "100 d.C." }, true);
    screen.getByText("▶");
    screen.getByText("100 d.C.");
    expect((screen.getByLabelText("Avanzamento") as HTMLInputElement).value).toBe("200");
  });

  it("mostra ❚❚ quando il tick dice playing:true, indipendentemente da modeSlice", () => {
    renderTimeline({ progress: 0.5, playing: true, yearLabel: "200 d.C." }, false);
    screen.getByText("❚❚");
  });

  it("click su Play/Pausa dispatcha setPlaying e richiama onSetPlaying con il valore opposto al tick corrente", () => {
    const { store, onSetPlaying } = renderTimeline({ progress: 0, playing: false, yearLabel: "1 d.C." });

    fireEvent.click(screen.getByLabelText("Play/Pausa"));

    expect(onSetPlaying).toHaveBeenCalledWith(true);
    expect(store.getState().mode.playing).toBe(true);
  });

  it("muovere lo scrubber chiama onSetProgress(p) e dispatcha setPlaying(false) (v12: lo scrub ferma il play)", () => {
    const { store, onSetProgress } = renderTimeline({ progress: 0, playing: true, yearLabel: "1 d.C." }, true);

    fireEvent.change(screen.getByLabelText("Avanzamento"), { target: { value: "350" } });

    expect(onSetProgress).toHaveBeenCalledWith(0.35);
    expect(store.getState().mode.playing).toBe(false);
  });
});
