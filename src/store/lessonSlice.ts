import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { aiLesson } from "../api/lezione";
import { toApiErrorInfo, type ApiErrorCode, type ApiErrorInfo } from "../api/errors";
import type { LessonCard } from "../types/scene";
import type { RootState } from "./index";

export type LessonStatus = "idle" | "loading" | "error";

export interface LessonState {
  card: LessonCard | null;
  openEventIndex: number | null;
  modalOpen: boolean;
  status: LessonStatus;
  errorCode: ApiErrorCode | null;
  errorMessage: string | null;
}

const initialState: LessonState = {
  card: null,
  openEventIndex: null,
  modalOpen: false,
  status: "idle",
  errorCode: null,
  errorMessage: null,
};

export interface LoadLessonArgs {
  title: string;
  event: string;
  year: number;
}

/** Chiama api/lezione.ts (aiLesson) per la scheda didattica dell'evento aperto sulla
 * timeline (issue A3/C2 già gestite lì). */
export const loadLesson = createAsyncThunk<LessonCard, LoadLessonArgs, { rejectValue: ApiErrorInfo }>(
  "lesson/loadLesson",
  async ({ title, event, year }, { rejectWithValue }) => {
    try {
      return await aiLesson(title, event, year);
    } catch (err) {
      return rejectWithValue(toApiErrorInfo(err));
    }
  },
);

const lessonSlice = createSlice({
  name: "lesson",
  initialState,
  reducers: {
    setLessonCard(state, action: PayloadAction<LessonCard | null>) {
      state.card = action.payload;
    },
    openLessonEvent(state, action: PayloadAction<number>) {
      state.openEventIndex = action.payload;
      state.modalOpen = true;
    },
    closeLessonModal(state) {
      state.modalOpen = false;
      state.openEventIndex = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLesson.pending, (state) => {
        state.status = "loading";
        state.errorCode = null;
        state.errorMessage = null;
      })
      .addCase(loadLesson.fulfilled, (state, action) => {
        state.status = "idle";
        state.card = action.payload;
        state.errorCode = null;
        state.errorMessage = null;
      })
      .addCase(loadLesson.rejected, (state, action) => {
        state.status = "error";
        state.errorCode = action.payload?.code ?? "internal_error";
        state.errorMessage = action.payload?.message ?? "Errore sconosciuto nel caricamento della lezione.";
      });
  },
});

export const { setLessonCard, openLessonEvent, closeLessonModal } = lessonSlice.actions;
export default lessonSlice.reducer;

export const selectLessonCard = (state: RootState) => state.lesson.card;
export const selectLessonOpenEventIndex = (state: RootState) => state.lesson.openEventIndex;
export const selectLessonModalOpen = (state: RootState) => state.lesson.modalOpen;
export const selectLessonStatus = (state: RootState) => state.lesson.status;
export const selectLessonError = (state: RootState): ApiErrorInfo | null =>
  state.lesson.errorCode ? { code: state.lesson.errorCode, message: state.lesson.errorMessage ?? "" } : null;
