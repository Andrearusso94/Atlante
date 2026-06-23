import { describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { ApiError } from "../api/errors";
import type { SceneSpec } from "../types/scene";

vi.mock("../api/genera", () => ({ generate: vi.fn() }));

import { generate } from "../api/genera";
import specReducer, { clearCurrentSpec, generateScene, setCurrentSpec } from "./specSlice";
import type { SpecState } from "./specSlice";

const generateMock = vi.mocked(generate);

const sampleSpec: SceneSpec = {
  archetype: "network",
  title: "Rotte",
  yearStart: 1,
  yearEnd: 2,
  items: [{ from: [0, 0], to: [1, 1], label: "x" }],
};

function createTestStore() {
  return configureStore({ reducer: { spec: specReducer } });
}

describe("specSlice reducers", () => {
  it("stato iniziale: nessuna spec, idle, nessun errore", () => {
    const state = specReducer(undefined, { type: "@@INIT" });
    expect(state).toEqual<SpecState>({ currentSpec: null, status: "idle", errorCode: null, errorMessage: null });
  });

  it("setCurrentSpec imposta la spec corrente", () => {
    const state = specReducer(undefined, setCurrentSpec(sampleSpec));
    expect(state.currentSpec).toEqual(sampleSpec);
  });

  it("clearCurrentSpec azzera la spec corrente", () => {
    const withSpec = specReducer(undefined, setCurrentSpec(sampleSpec));
    const cleared = specReducer(withSpec, clearCurrentSpec());
    expect(cleared.currentSpec).toBeNull();
  });
});

describe("generateScene thunk", () => {
  it("pending->fulfilled: scrive la SceneSpec e torna a idle", async () => {
    generateMock.mockResolvedValue(sampleSpec);
    const store = createTestStore();

    const promise = store.dispatch(generateScene("una rotta"));
    expect(store.getState().spec.status).toBe("loading");

    await promise;

    expect(generateMock).toHaveBeenCalledWith("una rotta");
    expect(store.getState().spec).toEqual({
      currentSpec: sampleSpec,
      status: "idle",
      errorCode: null,
      errorMessage: null,
    });
  });

  it("pending->rejected: propaga il codice ApiError (es. rate_limited)", async () => {
    generateMock.mockRejectedValue(new ApiError("rate_limited", 429, "Troppe richieste."));
    const store = createTestStore();

    await store.dispatch(generateScene("una rotta"));

    const state = store.getState().spec;
    expect(state.status).toBe("error");
    expect(state.errorCode).toBe("rate_limited");
    expect(state.errorMessage).toBe("Troppe richieste.");
    expect(state.currentSpec).toBeNull();
  });

  it("un errore non-ApiError ricade su internal_error (confine difensivo toApiErrorInfo)", async () => {
    generateMock.mockRejectedValue(new Error("boom"));
    const store = createTestStore();

    await store.dispatch(generateScene("una rotta"));

    const state = store.getState().spec;
    expect(state.status).toBe("error");
    expect(state.errorCode).toBe("internal_error");
    expect(state.errorMessage).toBe("boom");
  });
});
