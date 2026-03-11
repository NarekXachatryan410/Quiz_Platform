import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

type AdminLoginRequest = {
  username: string;
  password: string;
};

type AdminLoginResponse = {
  data: {
    message: string;
    token: string;
    user: {
      id: number;
      username: string;
    };
  };
};

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4002";

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: fetchBaseQuery({
    baseUrl,
  }),
  endpoints: (builder) => ({
    adminLogin: builder.mutation<AdminLoginResponse, AdminLoginRequest>(
      {
        query: (credentials) => ({
          url: "/admin/login",
          method: "POST",
          body: credentials,
        }),
      },
    ),
  }),
});


export const { useAdminLoginMutation } = adminApi;
