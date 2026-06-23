import { describe, expect, it } from "vitest";
import type { QuizItem } from "../../types/peste";
import {
  buildQuizOrder,
  isQuizFinished,
  quizFeedbackText,
  quizResultMessage,
  resolveQuizAnswer,
  shuffleOrder,
} from "./quizLogic";

const ITEMS: QuizItem[] = [
  { a: "France", q: "Dove?" },
  { a: "Norway", q: "Dove approdò a Bergen?" },
  { a: "Poland", q: "Quale regno fu risparmiato?" },
];

describe("shuffleOrder", () => {
  it("restituisce una permutazione dell'input, senza mutarlo", () => {
    const input = [0, 1, 2, 3, 4];
    const result = shuffleOrder(input);
    expect(input).toEqual([0, 1, 2, 3, 4]); // non mutato
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual(input);
  });
});

describe("buildQuizOrder", () => {
  it("genera gli indici 0..total-1, mescolati", () => {
    const order = buildQuizOrder(5);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("con total=0 restituisce un array vuoto", () => {
    expect(buildQuizOrder(0)).toEqual([]);
  });
});

describe("resolveQuizAnswer", () => {
  it("risposta corretta: clicca esattamente sulla regione attesa", () => {
    const order = [1, 0, 2]; // domanda corrente (pos 0) è ITEMS[1] = Norway
    const result = resolveQuizAnswer(ITEMS, order, 0, "Norway");
    expect(result).toEqual({ correct: true, targetName: "Norway" });
  });

  it("risposta sbagliata: clicca su un'altra regione", () => {
    const order = [1, 0, 2];
    const result = resolveQuizAnswer(ITEMS, order, 0, "France");
    expect(result).toEqual({ correct: false, targetName: "Norway" });
  });

  it("usa `pos` per scegliere la domanda corrente entro `order`, non l'indice diretto in `items`", () => {
    const order = [2, 1, 0]; // a pos=1 la domanda è ITEMS[order[1]] = ITEMS[1] = Norway
    expect(resolveQuizAnswer(ITEMS, order, 1, "Norway").correct).toBe(true);
    expect(resolveQuizAnswer(ITEMS, order, 2, "France").correct).toBe(true); // ITEMS[order[2]] = ITEMS[0]
  });
});

describe("isQuizFinished", () => {
  it("falso mentre pos è entro l'ordine, vero quando lo raggiunge o lo supera", () => {
    const order = [0, 1, 2];
    expect(isQuizFinished(order, 0)).toBe(false);
    expect(isQuizFinished(order, 2)).toBe(false);
    expect(isQuizFinished(order, 3)).toBe(true);
    expect(isQuizFinished(order, 4)).toBe(true);
  });

  it("un ordine vuoto è sempre finito", () => {
    expect(isQuizFinished([], 0)).toBe(true);
  });
});

describe("quizFeedbackText", () => {
  it("risposta corretta: marca di spunta col nome cliccato", () => {
    expect(quizFeedbackText(true, "Norvegia", "Norvegia")).toBe("✓ Esatto — Norvegia");
  });

  it("risposta sbagliata: indica sia la risposta attesa che quella cliccata", () => {
    expect(quizFeedbackText(false, "Norvegia", "Francia")).toBe("✗ Era Norvegia — hai indicato Francia");
  });
});

describe("quizResultMessage", () => {
  it("sotto il 40%: invita a rivedere col tour", () => {
    expect(quizResultMessage(1, 9)).toBe("Riprova: rivedi le tappe col tour guidato.");
  });

  it("tra 40% e 75%: buon lavoro", () => {
    expect(quizResultMessage(4, 9)).toBe("Buon lavoro!");
  });

  it("tra 75% e 100% (escluso): ottimo", () => {
    expect(quizResultMessage(7, 9)).toBe("Ottimo!");
  });

  it("100%: perfetto", () => {
    expect(quizResultMessage(9, 9)).toBe("Perfetto! Tutte giuste.");
  });

  it("con total=0 non divide per zero", () => {
    expect(quizResultMessage(0, 0)).toBe("");
  });
});
