import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SceneSpec } from "../types/scene";

export interface SpecState {
  currentSpec: SceneSpec | null;
}

const initialState: SpecState = {
  currentSpec: null,
};

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
});

export const { setCurrentSpec, clearCurrentSpec } = specSlice.actions;
export default specSlice.reducer;
