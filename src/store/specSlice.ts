import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { generate } from "../api/genera";
import { toApiErrorInfo, type ApiErrorCode, type ApiErrorInfo } from "../api/errors";
import type { SceneSpec } from "../types/scene";
import type { RootState } from "./index";

export type SpecStatus = "idle" | "loading" | "error";

export interface SpecState {
  currentSpec: SceneSpec | null;
  status: SpecStatus;
  errorCode: ApiErrorCode | null;
  errorMessage: string | null;
}

const initialState: SpecState = {
  currentSpec: null,
  status: "idle",
  errorCode: null,
  errorMessage: null,
};

/** Chiama api/genera.ts (issue A3/C2 già gestite lì) e scrive la SceneSpec risultante.
 * Il fallback offline resta a livello feature (App.tsx), come `onGenerate` nel v12: in
 * caso di rejected questo thunk si limita a registrare codice/messaggio dell'errore. */
export const generateScene = createAsyncThunk<SceneSpec, string, { rejectValue: ApiErrorInfo }>(
  "spec/generateScene",
  async (q, { rejectWithValue }) => {
    try {
      return await generate(q);
    } catch (err) {
      return rejectWithValue(toApiErrorInfo(err));
    }
  },
);

const specSlice = createSlice({
  name: "spec",
  initialState,
  reducers: {
    setCurrentSpec(state, action: PayloadAction<SceneSpec>) {
      state.currentSpec = action.payload;
    },
    clearCurrentSpec(state) {
      state.currentSpec = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateScene.pending, (state) => {
        state.status = "loading";
        state.errorCode = null;
        state.errorMessage = null;
      })
      .addCase(generateScene.fulfilled, (state, action) => {
        state.status = "idle";
        state.currentSpec = action.payload;
        state.errorCode = null;
        state.errorMessage = null;
      })
      .addCase(generateScene.rejected, (state, action) => {
        state.status = "error";
        state.errorCode = action.payload?.code ?? "internal_error";
        state.errorMessage = action.payload?.message ?? "Errore sconosciuto nella generazione.";
      });
  },
});

export const { setCurrentSpec, clearCurrentSpec } = specSlice.actions;
export default specSlice.reducer;

export const selectCurrentSpec = (state: RootState) => state.spec.currentSpec;
export const selectSpecStatus = (state: RootState) => state.spec.status;
export const selectSpecError = (state: RootState): ApiErrorInfo | null =>
  state.spec.errorCode ? { code: state.spec.errorCode, message: state.spec.errorMessage ?? "" } : null;
