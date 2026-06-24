import { describe, expect, it } from "vitest";
import modeReducer, {
  answerQuiz,
  endQuiz,
  endTour,
  setBordersOn,
  setPlagueActive,
  setPlaying,
  setPresent,
  setTheme,
  setTourIdx,
  setTourPaused,
  startQuiz,
  startTour,
} from "./modeSlice";
import type { ModeState } from "./modeSlice";

describe("modeSlice reducers", () => {
  it("stato iniziale", () => {
    const state = modeReducer(undefined, { type: "@@INIT" });
    expect(state).toEqual<ModeState>({
      tourActive: false,
      tourIdx: 0,
      tourPaused: false,
      quizActive: false,
      quizScore: 0,
      quizPos: 0,
      quizOrder: [],
      present: false,
      plagueActive: false,
      bordersOn: false,
      theme: "term",
      playing: false,
    });
  });

  it("startTour attiva il tour e azzera idx/paused anche se erano già impostati", () => {
    const mid = modeReducer(undefined, setTourIdx(3));
    const state = modeReducer(mid, startTour());
    expect(state.tourActive).toBe(true);
    expect(state.tourIdx).toBe(0);
    expect(state.tourPaused).toBe(false);
  });

  it("endTour disattiva il tour", () => {
    const started = modeReducer(undefined, startTour());
    const state = modeReducer(started, endTour());
    expect(state.tourActive).toBe(false);
    expect(state.tourPaused).toBe(false);
  });

  it("setTourPaused imposta la pausa", () => {
    const state = modeReducer(undefined, setTourPaused(true));
    expect(state.tourPaused).toBe(true);
  });

  it("startQuiz inizializza punteggio/posizione/ordine", () => {
    const state = modeReducer(undefined, startQuiz([2, 0, 1]));
    expect(state).toMatchObject({ quizActive: true, quizScore: 0, quizPos: 0, quizOrder: [2, 0, 1] });
  });

  it("answerQuiz incrementa lo score solo se corretto, e sempre la posizione", () => {
    const afterCorrect = modeReducer(undefined, answerQuiz({ correct: true }));
    expect(afterCorrect).toMatchObject({ quizScore: 1, quizPos: 1 });
    const afterWrong = modeReducer(afterCorrect, answerQuiz({ correct: false }));
    expect(afterWrong).toMatchObject({ quizScore: 1, quizPos: 2 });
  });

  it("endQuiz disattiva il quiz", () => {
    const started = modeReducer(undefined, startQuiz([0]));
    const state = modeReducer(started, endQuiz());
    expect(state.quizActive).toBe(false);
  });

  it("setPresent/setPlagueActive/setBordersOn/setTheme impostano i toggle persistenti", () => {
    expect(modeReducer(undefined, setPresent(true)).present).toBe(true);
    expect(modeReducer(undefined, setPlagueActive(true)).plagueActive).toBe(true);
    expect(modeReducer(undefined, setBordersOn(true)).bordersOn).toBe(true);
    expect(modeReducer(undefined, setTheme("night")).theme).toBe("night");
  });

  it("setPlaying registra solo l'intento dell'utente (il dato vivo resta nel motore, non qui)", () => {
    expect(modeReducer(undefined, setPlaying(true)).playing).toBe(true);
    expect(modeReducer(undefined, setPlaying(false)).playing).toBe(false);
  });
});
