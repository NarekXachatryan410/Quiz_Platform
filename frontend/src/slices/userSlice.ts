import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type UserState = {
  token: string | null;
  adminLogin: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const initialState: UserState = {
  token: localStorage.getItem("token"),
  adminLogin: null,
  isAuthenticated: false,
  isLoading: false
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setAdminSession: (
      state,
      action: PayloadAction<{ token: string; login: string }>,
    ) => {
      state.token = action.payload.token;
      state.adminLogin = action.payload.login;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.token = null;
      state.adminLogin = null;
      state.isAuthenticated = false;
    },
    setLoading: (state) => {
      state.isLoading = true
    }
  },
});

export const { setAdminSession, logout, setLoading} = userSlice.actions;
export default userSlice.reducer;
