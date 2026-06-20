import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LessonCard } from "../types/scene";

export interface LessonState {
  card: LessonCard | null;
  openEventIndex: number | null;
  modalOpen: boolean;
}

const initialState: LessonState = {
  card: null,
  openEventIndex: null,
  modalOpen: false,
};

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
});

export const { setLessonCard, openLessonEvent, closeLessonModal } = lessonSlice.actions;
export default lessonSlice.reducer;
