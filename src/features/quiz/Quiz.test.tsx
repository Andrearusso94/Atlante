// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import modeReducer, { setBordersOn, setPlagueActive } from "../../store/modeSlice";
import { byName, QUIZ } from "../../data/peste";
import { FEEDBACK_MS, OVERVIEW } from "./quizLogic";
import Quiz, { type QuizClick } from "./Quiz";

function renderQuiz(preload?: { bordersOn?: boolean; plagueActive?: boolean }) {
  const store = configureStore({ reducer: { mode: modeReducer } });
  if (preload?.bordersOn) store.dispatch(setBordersOn(true));
  if (preload?.plagueActive) store.dispatch(setPlagueActive(true));
  const onFlyTo = vi.fn();

  function Harness({ click }: { click: QuizClick | null }) {
    return (
      <Provider store={store}>
        <Quiz onFlyTo={onFlyTo} click={click} />
      </Provider>
    );
  }

  const { rerender } = render(<Harness click={null} />);
  function setClick(click: QuizClick | null) {
    rerender(<Harness click={click} />);
  }
  return { store, onFlyTo, setClick };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Legge dallo store la domanda corrente e la sua risposta attesa — non dipende
 * dall'ordine mescolato, mai un click DOM reale sul globo: solo stato finto via prop. */
function currentTarget(store: ReturnType<typeof renderQuiz>["store"]) {
  const { quizOrder, quizPos } = store.getState().mode;
  return QUIZ[quizOrder[quizPos]].a as string;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Quiz", () => {
  it("a riposo mostra solo il pulsante di lancio, nessun flyTo", () => {
    const { onFlyTo } = renderQuiz();
    screen.getByText("❓ Quiz");
    expect(onFlyTo).not.toHaveBeenCalled();
  });

  it("avvio: attiva il quiz, forza confini+peste (se non già attivi) e vola sulla vista d'insieme", () => {
    const { store, onFlyTo } = renderQuiz();

    fireEvent.click(screen.getByText("❓ Quiz"));

    const state = store.getState().mode;
    expect(state.quizActive).toBe(true);
    expect(state.quizScore).toBe(0);
    expect(state.quizPos).toBe(0);
    expect([...state.quizOrder].sort((a, b) => a - b)).toEqual(QUIZ.map((_, i) => i));
    expect(state.bordersOn).toBe(true);
    expect(state.plagueActive).toBe(true);
    expect(onFlyTo).toHaveBeenCalledWith(OVERVIEW[0], OVERVIEW[1]);
    screen.getByText(`Domanda 1 / ${QUIZ.length}`, { exact: false });
  });

  it("risposta corretta: somma SUBITO il punteggio, mostra il feedback positivo e vola sulla regione — la posizione non avanza ancora", () => {
    const { store, onFlyTo, setClick } = renderQuiz();
    fireEvent.click(screen.getByText("❓ Quiz"));
    const target = currentTarget(store);
    const targetDef = byName(target)!;
    onFlyTo.mockClear();

    setClick({ name: target, seq: 1 });

    // v12 (quizAnswer, righe 1072-1083): punteggio e feedback immediati, ma `quizPos`
    // avanza solo dopo FEEDBACK_MS — durante il feedback si resta sulla stessa domanda.
    expect(store.getState().mode).toMatchObject({ quizScore: 1, quizPos: 0 });
    screen.getByText(`✓ Esatto — ${targetDef.label}`);
    screen.getByText(`Domanda 1 / ${QUIZ.length}`, { exact: false });
    expect(onFlyTo).toHaveBeenCalledWith(targetDef.ll[0], targetDef.ll[1]);
  });

  it("risposta sbagliata: non somma il punteggio, mostra il feedback negativo — la posizione non avanza ancora", () => {
    const { store, setClick } = renderQuiz();
    fireEvent.click(screen.getByText("❓ Quiz"));
    const target = currentTarget(store);
    const targetDef = byName(target)!;
    const wrong = QUIZ.find((item) => item.a !== target)!.a;
    const wrongDef = byName(wrong)!;

    setClick({ name: wrong, seq: 1 });

    expect(store.getState().mode).toMatchObject({ quizScore: 0, quizPos: 0 });
    screen.getByText(`✗ Era ${targetDef.label} — hai indicato ${wrongDef.label}`);
  });

  it("la domanda avanza solo dopo FEEDBACK_MS, non insieme al feedback (v12: quizPos++ dentro il setTimeout)", () => {
    const { store, setClick } = renderQuiz();
    fireEvent.click(screen.getByText("❓ Quiz"));
    const target = currentTarget(store);
    const targetDef = byName(target)!;

    setClick({ name: target, seq: 1 });
    screen.getByText(`✓ Esatto — ${targetDef.label}`);
    // Per tutta la finestra di feedback la domanda a video resta quella appena risposta.
    screen.getByText(`Domanda 1 / ${QUIZ.length}`, { exact: false });
    expect(store.getState().mode.quizPos).toBe(0);

    advance(FEEDBACK_MS);

    expect(screen.queryByText(`✓ Esatto — ${targetDef.label}`)).toBeNull();
    expect(store.getState().mode.quizPos).toBe(1);
    screen.getByText(`Domanda 2 / ${QUIZ.length}`, { exact: false });
  });

  it("ignora un tap duplicato con la stessa seq (stesso evento instradato due volte)", () => {
    const { store, setClick } = renderQuiz();
    fireEvent.click(screen.getByText("❓ Quiz"));
    const target = currentTarget(store);

    setClick({ name: target, seq: 1 });
    expect(store.getState().mode.quizScore).toBe(1);

    setClick({ name: target, seq: 1 }); // stessa seq, nuovo oggetto: deve essere ignorato
    expect(store.getState().mode.quizScore).toBe(1);

    advance(FEEDBACK_MS);
    expect(store.getState().mode.quizPos).toBe(1);
  });

  it("ignora un tap arrivato durante la finestra di feedback (v12 quizLock)", () => {
    const { store, setClick } = renderQuiz();
    fireEvent.click(screen.getByText("❓ Quiz"));
    const target = currentTarget(store);

    setClick({ name: target, seq: 1 });
    expect(store.getState().mode.quizScore).toBe(1);
    expect(store.getState().mode.quizPos).toBe(0);

    // quizPos non è ancora avanzato: questa è di nuovo la domanda corrente, non la prossima.
    setClick({ name: currentTarget(store), seq: 2 }); // seq nuova, ma siamo ancora nella finestra di lock
    expect(store.getState().mode.quizScore).toBe(1); // non contato
    expect(store.getState().mode.quizPos).toBe(0);

    advance(FEEDBACK_MS);
    expect(store.getState().mode.quizPos).toBe(1);

    const target2 = currentTarget(store);
    setClick({ name: target2, seq: 3 }); // ora il lock si è liberato
    expect(store.getState().mode.quizScore).toBe(2);

    advance(FEEDBACK_MS);
    expect(store.getState().mode.quizPos).toBe(2);
  });

  it("uscita manuale: ripristina confini/peste se li aveva accesi lei e disattiva il quiz", () => {
    const { store } = renderQuiz();
    fireEvent.click(screen.getByText("❓ Quiz"));

    fireEvent.click(screen.getByLabelText("Chiudi quiz"));

    expect(store.getState().mode).toMatchObject({ quizActive: false, bordersOn: false, plagueActive: false });
  });

  it("non disattiva confini/peste all'uscita se erano già attivi prima del quiz", () => {
    const { store } = renderQuiz({ bordersOn: true, plagueActive: true });
    fireEvent.click(screen.getByText("❓ Quiz"));

    fireEvent.click(screen.getByLabelText("Chiudi quiz"));

    expect(store.getState().mode).toMatchObject({ quizActive: false, bordersOn: true, plagueActive: true });
  });

  it("risponde a tutte le domande: alla fine esce da sola e ripristina confini/peste", () => {
    const { store, setClick } = renderQuiz();
    fireEvent.click(screen.getByText("❓ Quiz"));

    let seq = 0;
    for (let i = 0; i < QUIZ.length; i++) {
      const target = currentTarget(store);
      seq += 1;
      setClick({ name: target, seq });
      advance(FEEDBACK_MS);
    }

    expect(store.getState().mode).toMatchObject({
      quizActive: false,
      quizScore: QUIZ.length,
      bordersOn: false,
      plagueActive: false,
    });
    screen.getByText("❓ Quiz"); // di nuovo il pulsante di lancio
  });
});
