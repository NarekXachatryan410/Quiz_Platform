import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface PlayerState {
  playerId: number | null;
  firstName: string;
  lastName: string;
  sessionId: number | null;
}

const initialState: PlayerState = {
  playerId: null,
  firstName: "",
  lastName: "",
  sessionId: null,
};

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    setPlayer: (state, action: PayloadAction<PlayerState>) => {
      return { ...state, ...action.payload };
    },
    clearPlayer: () => initialState,
  },
});

export const { setPlayer, clearPlayer } = playerSlice.actions;
export default playerSlice.reducer;