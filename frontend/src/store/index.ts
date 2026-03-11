import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../slices/userSlice";
import { adminApi } from "../services/adminApi";
import sessionReducer from "../slices/sessionSlice"
import playerReducer from "../slices/playerSlice"
import { sessionApi } from "../services/sessionApi";


export const store = configureStore({
  reducer: {
    user: userReducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [sessionApi.reducerPath]: sessionApi.reducer,
    sessions: sessionReducer,
    players: playerReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
    .concat(adminApi.middleware)
    .concat(sessionApi.middleware)
  ,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
