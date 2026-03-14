import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface PlayerState {
  playerId: number | null;
  firstName: string;
  lastName: string;
  sessionId: number | null;
  totalScore: number;
}

const initialState: PlayerState = {
  playerId: null,
  firstName: "",
  lastName: "",
  sessionId: null,
  totalScore: 0,
};

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    setPlayer: (state, action: PayloadAction<PlayerState>) => {
      return { ...state, ...action.payload };
    },
    updateTotalScore: (state, action: PayloadAction<number>) => {
      state.totalScore = action.payload;
    },
    clearPlayer: () => initialState,
  },
});

export const { setPlayer, updateTotalScore, clearPlayer } = playerSlice.actions;
export default playerSlice.reducer;