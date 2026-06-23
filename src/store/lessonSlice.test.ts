import { describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { ApiError } from "../api/errors";
import type { LessonCard } from "../types/scene";

vi.mock("../api/lezione", () => ({ aiLesson: vi.fn() }));

import { aiLesson } from "../api/lezione";
import lessonReducer, { closeLessonModal, loadLesson, openLessonEvent, setLessonCard } from "./lessonSlice";
import type { LessonState } from "./lessonSlice";

const aiLessonMock = vi.mocked(aiLesson);

const sampleCard: LessonCard = {
  context: "ctx",
  what: "what",
  causes: ["a"],
  consequences: ["b"],
  quote: "q",
  classroom: ["c"],
};

function createTestStore() {
  return configureStore({ reducer: { lesson: lessonReducer } });
}

describe("lessonSlice reducers", () => {
  it("stato iniziale: nessuna card, modale chiusa, idle", () => {
    const state = lessonReducer(undefined, { type: "@@INIT" });
    expect(state).toEqual<LessonState>({
      card: null,
      openEventIndex: null,
      modalOpen: false,
      status: "idle",
      errorCode: null,
      errorMessage: null,
    });
  });

  it("openLessonEvent apre la modale sull'indice scelto", () => {
    const state = lessonReducer(undefined, openLessonEvent(2));
    expect(state.openEventIndex).toBe(2);
    expect(state.modalOpen).toBe(true);
  });

  it("closeLessonModal chiude la modale e azzera l'indice aperto", () => {
    const opened = lessonReducer(undefined, openLessonEvent(2));
    const closed = lessonReducer(opened, closeLessonModal());
    expect(closed.modalOpen).toBe(false);
    expect(closed.openEventIndex).toBeNull();
  });

  it("setLessonCard imposta/azzera la card", () => {
    const withCard = lessonReducer(undefined, setLessonCard(sampleCard));
    expect(withCard.card).toEqual(sampleCard);
    const cleared = lessonReducer(withCard, setLessonCard(null));
    expect(cleared.card).toBeNull();
  });
});

describe("loadLesson thunk", () => {
  it("pending->fulfilled: scrive la LessonCard e torna a idle", async () => {
    aiLessonMock.mockResolvedValue(sampleCard);
    const store = createTestStore();

    const promise = store.dispatch(loadLesson({ title: "La peste nera", event: "Da Caffa a Messina", year: 1347 }));
    expect(store.getState().lesson.status).toBe("loading");

    await promise;

    expect(aiLessonMock).toHaveBeenCalledWith("La peste nera", "Da Caffa a Messina", 1347);
    expect(store.getState().lesson.card).toEqual(sampleCard);
    expect(store.getState().lesson.status).toBe("idle");
  });

  it("pending->rejected: propaga il codice ApiError (es. upstream_timeout)", async () => {
    aiLessonMock.mockRejectedValue(new ApiError("upstream_timeout", 504, "L'IA non ha risposto in tempo."));
    const store = createTestStore();

    await store.dispatch(loadLesson({ title: "x", event: "y", year: 1 }));

    const state = store.getState().lesson;
    expect(state.status).toBe("error");
    expect(state.errorCode).toBe("upstream_timeout");
    expect(state.errorMessage).toBe("L'IA non ha risposto in tempo.");
    expect(state.card).toBeNull();
  });
});
