import { configureStore } from "@reduxjs/toolkit";
import specReducer from "./specSlice";
import lessonReducer from "./lessonSlice";
import modeReducer from "./modeSlice";

export const store = configureStore({
  reducer: {
    spec: specReducer,
    lesson: lessonReducer,
    mode: modeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
