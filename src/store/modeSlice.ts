import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./index";

export type Theme = "day" | "term" | "night";

export interface ModeState {
  // tour guidato
  tourActive: boolean;
  tourIdx: number;
  tourPaused: boolean;
  // quiz "clicca il territorio"
  quizActive: boolean;
  quizScore: number;
  quizPos: number;
  quizOrder: number[];
  // modalità presentazione (LIM) — solo CSS, vedi features/present/
  present: boolean;
  // layer Peste attivo sul globo
  plagueActive: boolean;
  // confini storici reali on/off
  bordersOn: boolean;
  // tema luce del globo
  theme: Theme;
}

const initialState: ModeState = {
  tourActive: false,
  tourIdx: 0,
  tourPaused: false,
  quizActive: false,
  quizScore: 0,
  quizPos: 0,
  quizOrder: [],
  present: false,
  plagueActive: false,
  bordersOn: false,
  theme: "day",
};

const modeSlice = createSlice({
  name: "mode",
  initialState,
  reducers: {
    startTour(state) {
      state.tourActive = true;
      state.tourPaused = false;
      state.tourIdx = 0;
    },
    endTour(state) {
      state.tourActive = false;
      state.tourPaused = false;
    },
    setTourIdx(state, action: PayloadAction<number>) {
      state.tourIdx = action.payload;
    },
    setTourPaused(state, action: PayloadAction<boolean>) {
      state.tourPaused = action.payload;
    },
    startQuiz(state, action: PayloadAction<number[]>) {
      state.quizActive = true;
      state.quizScore = 0;
      state.quizPos = 0;
      state.quizOrder = action.payload;
    },
    endQuiz(state) {
      state.quizActive = false;
    },
    answerQuiz(state, action: PayloadAction<{ correct: boolean }>) {
      if (action.payload.correct) state.quizScore += 1;
      state.quizPos += 1;
    },
    setPresent(state, action: PayloadAction<boolean>) {
      state.present = action.payload;
    },
    setPlagueActive(state, action: PayloadAction<boolean>) {
      state.plagueActive = action.payload;
    },
    setBordersOn(state, action: PayloadAction<boolean>) {
      state.bordersOn = action.payload;
    },
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
  },
});

export const {
  startTour,
  endTour,
  setTourIdx,
  setTourPaused,
  startQuiz,
  endQuiz,
  answerQuiz,
  setPresent,
  setPlagueActive,
  setBordersOn,
  setTheme,
} = modeSlice.actions;
export default modeSlice.reducer;

export const selectTour = (state: RootState) => ({
  active: state.mode.tourActive,
  idx: state.mode.tourIdx,
  paused: state.mode.tourPaused,
});
export const selectQuiz = (state: RootState) => ({
  active: state.mode.quizActive,
  score: state.mode.quizScore,
  pos: state.mode.quizPos,
  order: state.mode.quizOrder,
});
export const selectPresent = (state: RootState) => state.mode.present;
export const selectTheme = (state: RootState) => state.mode.theme;
export const selectBordersOn = (state: RootState) => state.mode.bordersOn;
export const selectPlagueActive = (state: RootState) => state.mode.plagueActive;
