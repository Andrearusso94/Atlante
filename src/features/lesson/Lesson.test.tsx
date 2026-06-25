// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { ApiError } from "../../api/errors";
import specReducer, { generateScene, setCurrentSpec } from "../../store/specSlice";
import lessonReducer from "../../store/lessonSlice";
import { FALLBACK } from "../../data/fallback";
import type { SceneSpec, LessonCard } from "../../types/scene";

vi.mock("../../api/lezione", () => ({ aiLesson: vi.fn() }));

import { aiLesson } from "../../api/lezione";
import Lesson from "./Lesson";

const aiLessonMock = vi.mocked(aiLesson);

// Spec "generata dall'IA": la timeline NON ha `detail` (l'IA non lo restituisce mai,
// solo i fallback curati a mano lo hanno — issue B2) quindi apre sempre la chiamata aiLesson.
const AI_SPEC: SceneSpec = {
  archetype: "network",
  title: "Guerre puniche",
  yearStart: -264,
  yearEnd: -146,
  items: [{ from: [0, 0], to: [1, 1], label: "rotta" }],
  teaching: { timeline: [{ year: -264, event: "Inizio della prima guerra punica" }] },
};

function renderLesson(preloadedSpec?: SceneSpec) {
  const store = configureStore({ reducer: { spec: specReducer, lesson: lessonReducer } });
  if (preloadedSpec) store.dispatch(setCurrentSpec(preloadedSpec));
  render(
    <Provider store={store}>
      <Lesson />
    </Provider>,
  );
  return store;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Lesson", () => {
  it("senza scena corrente mostra il placeholder, ma Carica resta sempre disponibile", () => {
    renderLesson();
    screen.getByText("Pronto per la lezione.");
    const saveButton = screen.getByRole("button", { name: "⤓ Salva lezione" }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
    screen.getByRole("button", { name: "⤴ Carica lezione" });
  });

  it("v12 (riga 540): period/summary assenti restano nel DOM come tag vuoti, non vengono rimossi", () => {
    renderLesson(AI_SPEC);

    const title = screen.getByText("Guerre puniche");
    const period = title.nextElementSibling as HTMLElement;
    const summary = period.nextElementSibling as HTMLElement;

    expect(period.tagName).toBe("P");
    expect(period.textContent).toBe("");
    expect(summary.tagName).toBe("P");
    expect(summary.textContent).toBe("");
  });

  it("v12 (riga 540): period/summary presenti vengono mostrati per intero", () => {
    renderLesson(FALLBACK.roma);

    screen.getByText(FALLBACK.roma.period!);
    screen.getByText(FALLBACK.roma.summary!);
  });

  it("v12 (riga 536): ogni riga della cronologia mostra il chevron cliccabile (›)", () => {
    renderLesson(FALLBACK.roma);

    const chevrons = screen.getAllByText("›");
    expect(chevrons).toHaveLength(FALLBACK.roma.teaching?.timeline?.length ?? 0);
    chevrons.forEach((c) => expect(c.getAttribute("aria-hidden")).toBe("true"));
  });

  it("v12 (riga 642): mentre si genera una nuova scena, il pannello mostra il caricamento al posto del contenuto", async () => {
    const store = renderLesson(FALLBACK.roma);

    store.dispatch(generateScene.pending("req-1", "una richiesta"));

    await waitFor(() => screen.getByText("L'IA sta costruendo la scena…"));
    expect(screen.queryByText(FALLBACK.roma.title)).toBeNull();
  });

  it("evento con detail curato (FALLBACK.peste): mostra il contesto senza mai chiamare aiLesson", async () => {
    renderLesson(FALLBACK.peste);

    fireEvent.click(screen.getByText("Da Caffa a Messina"));

    await waitFor(() => screen.getByText(/Lezione di esempio curata a mano\./));
    screen.getByText(/La peste arriva in Europa con le navi genovesi/);
    expect(aiLessonMock).not.toHaveBeenCalled();
  });

  it("evento senza detail: chiama loadLesson, mostra loading e poi il disclaimer IA", async () => {
    const card: LessonCard = {
      context: "ctx",
      what: "what",
      causes: ["causa"],
      consequences: ["conseguenza"],
      quote: "una citazione verificabile",
      classroom: ["uno spunto"],
    };
    aiLessonMock.mockResolvedValue(card);
    const store = renderLesson(AI_SPEC);

    fireEvent.click(screen.getByText("Inizio della prima guerra punica"));

    expect(store.getState().lesson.status).toBe("loading");
    await waitFor(() => screen.getByText("Sto preparando la lezione…"));

    await waitFor(() =>
      expect(aiLessonMock).toHaveBeenCalledWith("Guerre puniche", "Inizio della prima guerra punica", -264),
    );
    await waitFor(() => screen.getByText("una citazione verificabile"));
    screen.getByText(/Lezione redatta dall'IA con ricerca web — verifica i dettagli prima dell'aula\./);
  });

  it("evento senza detail, l'IA non risponde: messaggio leggibile e distinto per codice (504)", async () => {
    aiLessonMock.mockRejectedValue(new ApiError("upstream_timeout", 504, "L'IA non ha risposto in tempo."));
    renderLesson(AI_SPEC);

    fireEvent.click(screen.getByText("Inizio della prima guerra punica"));

    await waitFor(() => screen.getByText("L'IA non ha risposto in tempo — riprova tra poco."));
  });

  it("Salva lezione: genera un blob JSON con la SceneSpec corrente e lo scarica", async () => {
    renderLesson(FALLBACK.roma);
    let capturedBlob: Blob | null = null;
    const createObjectURLMock = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });
    const revokeObjectURLMock = vi.fn();
    URL.createObjectURL = createObjectURLMock as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURLMock as typeof URL.revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    fireEvent.click(screen.getByRole("button", { name: "⤓ Salva lezione" }));

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");
    expect(capturedBlob).not.toBeNull();
    const text = await capturedBlob!.text();
    expect(JSON.parse(text)).toEqual(FALLBACK.roma);

    clickSpy.mockRestore();
  });

  it("Carica lezione: un file JSON valido sostituisce la scena corrente senza mai chiamare l'IA", async () => {
    const store = renderLesson();
    const file = new File([JSON.stringify(FALLBACK.colombo)], "colombo.json", { type: "application/json" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(store.getState().spec.currentSpec).toEqual(FALLBACK.colombo));
    expect(aiLessonMock).not.toHaveBeenCalled();
  });

  it("Carica lezione: un file non valido mostra un errore inline (niente alert(), C2: validato con Zod)", async () => {
    renderLesson();
    const file = new File(["{ non e' json valido"], "rotto.json", { type: "application/json" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => screen.getByText("File lezione non valido."));
  });
});
