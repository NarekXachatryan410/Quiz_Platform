import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SessionState, Session } from "../types/session";

const initialState: SessionState = {
    sessions: [],
    currentSession: null,
}

export const sessionSlice = createSlice({
    name: "sessions",
    initialState,
    reducers: {
        setCurrentSession: (state, action: PayloadAction<Session>) => {
            state.currentSession = action.payload
        },

        addSession: (state, action: PayloadAction<Session>) => {
            state.sessions.push(action.payload)
        },
        setSessions: (state, action: PayloadAction<Session[]>) => {
            state.sessions.push(...action.payload)
        }
    },
})

export const { setCurrentSession, addSession, setSessions } = sessionSlice.actions
export default sessionSlice.reducer;