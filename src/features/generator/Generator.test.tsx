// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { ApiError } from "../../api/errors";
import specReducer from "../../store/specSlice";
import { FALLBACK } from "../../data/fallback";

vi.mock("../../api/genera", () => ({ generate: vi.fn() }));

import { generate } from "../../api/genera";
import Generator from "./Generator";

const generateMock = vi.mocked(generate);

function renderGenerator() {
  const store = configureStore({ reducer: { spec: specReducer } });
  render(
    <Provider store={store}>
      <Generator />
    </Provider>,
  );
  return store;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Generator", () => {
  it("mostra le chips di esempio del v12 e disabilita Genera con input vuoto", () => {
    renderGenerator();
    screen.getByText("L'espansione dell'impero romano");
    screen.getByText("I viaggi di Colombo");
    screen.getByText("La peste nera");
    const genButton = screen.getByRole("button", { name: "Genera" }) as HTMLButtonElement;
    expect(genButton.disabled).toBe(true);
  });

  it("submit chiama generateScene, mostra loading e poi l'avviso lastDataNote sul successo", async () => {
    generateMock.mockResolvedValue(FALLBACK.roma);
    const store = renderGenerator();

    fireEvent.change(screen.getByLabelText("Richiesta per il generatore"), {
      target: { value: "impero romano" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Genera" }));

    // Il dispatch del thunk scatta "pending" in modo sincrono, prima di risolvere generate().
    expect(store.getState().spec.status).toBe("loading");
    await waitFor(() => screen.getByText("L'IA sta costruendo la scena…"));

    await waitFor(() => expect(generateMock).toHaveBeenCalledWith("impero romano"));
    await waitFor(() => screen.getByText(/Coordinate generate dall'IA/));
    expect(store.getState().spec.currentSpec).toEqual(FALLBACK.roma);
  });

  it("click su una chip popola l'input e genera, come nel v12", async () => {
    generateMock.mockResolvedValue(FALLBACK.colombo);
    renderGenerator();

    fireEvent.click(screen.getByText("I viaggi di Colombo"));

    await waitFor(() => expect(generateMock).toHaveBeenCalledWith("I viaggi di Colombo"));
    expect((screen.getByLabelText("Richiesta per il generatore") as HTMLInputElement).value).toBe(
      "I viaggi di Colombo",
    );
  });

  it("errore senza fallback disponibile: messaggio leggibile e distinto per codice (429 rate_limited)", async () => {
    generateMock.mockRejectedValue(new ApiError("rate_limited", 429, "Troppe richieste. Riprova tra poco."));
    renderGenerator();

    fireEvent.change(screen.getByLabelText("Richiesta per il generatore"), {
      target: { value: "una richiesta a caso" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Genera" }));

    await waitFor(() => screen.getByText("Troppe richieste in questo momento — riprova tra poco."));
  });

  it("errore con fallback disponibile (v12: catch di onGenerate): carica l'esempio offline al posto dell'errore", async () => {
    generateMock.mockRejectedValue(new ApiError("upstream_timeout", 504, "L'IA non ha risposto in tempo."));
    const store = renderGenerator();

    fireEvent.change(screen.getByLabelText("Richiesta per il generatore"), {
      target: { value: "la peste nera" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Genera" }));

    await waitFor(() => expect(store.getState().spec.currentSpec).toEqual(FALLBACK.peste));
    screen.getByText(/mostro l'esempio offline/);
    expect(screen.queryByText(/non ha risposto in tempo/)).toBeNull();
  });

  it("bottone 'esempi offline' carica un esempio senza mai chiamare l'IA", () => {
    const store = renderGenerator();

    fireEvent.click(screen.getByRole("button", { name: "Peste nera" }));

    expect(generateMock).not.toHaveBeenCalled();
    expect(store.getState().spec.currentSpec).toEqual(FALLBACK.peste);
    screen.getByText(/Esempio offline caricato/);
  });
});
