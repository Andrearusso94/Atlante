import { describe, expect, it } from "vitest";
import { routePlagueClick } from "./plagueClickRoute";

describe("routePlagueClick", () => {
  it("quiz attivo: instrada sempre a 'quiz', anche se il tour fosse attivo insieme", () => {
    expect(routePlagueClick({ tourActive: false, quizActive: true })).toBe("quiz");
    expect(routePlagueClick({ tourActive: true, quizActive: true })).toBe("quiz");
  });

  it("tour attivo (e quiz no): instrada a 'tour' (v12: il tap non fa nulla)", () => {
    expect(routePlagueClick({ tourActive: true, quizActive: false })).toBe("tour");
  });

  it("né tour né quiz attivi: instrada a 'igCard'", () => {
    expect(routePlagueClick({ tourActive: false, quizActive: false })).toBe("igCard");
  });
});
