import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import type { Session } from "../types/session";

type CreateSessionRequest = {
  roomCode: string;
  name: string;
  maxParticipants: number;
};

type ApiResponse<T> = { data: T };

const baseUrl = import.meta.env.VITE_BASE_URL ?? "http://localhost:4002";

export const sessionApi = createApi({
  reducerPath: "sessionApi",
  tagTypes: ["Sessions"],
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).user.token

        if(token) {
            headers.set("authorization", `Bearer ${token}`)
        }

        return headers
    }
  }),
  endpoints: (builder) => ({
    createSession: builder.mutation<ApiResponse<{ newSession: Session }>, CreateSessionRequest>(
      {
        query: (payload) => ({
          url: "/admin/sessions",
          method: "POST",
          body: payload,
        }),
        invalidatesTags: ["Sessions"],
      },
    ),
    getSessions: builder.query<Session[], void>(
      {
        query: () => ({
          url: "/admin/sessions",
        }),
        transformResponse: (res: ApiResponse<Session[]>) => res.data,
        providesTags: ["Sessions"],
      }
    ),
    getSessionById: builder.query<Session, number>(
      {
        query: (sessionId) => ({
          url: `/admin/sessions/${sessionId}`,
        }),
        transformResponse: (res: ApiResponse<Session>) => res.data,
        providesTags: ["Sessions"],
      }
    ),
    startSession: builder.mutation<ApiResponse<Session>, number>(
      {
        query: (sessionId) => ({
          url: `/admin/sessions/${sessionId}/start`,
          method: "PATCH",
        }),
        invalidatesTags: ["Sessions"],
      }
    ),
    joinSession: builder.mutation<ApiResponse<Session>, any>(
      {
        query: (data) => ({
          url: "/sessions/join",
          method: "POST",
          body: data
        }),
        invalidatesTags: ["Sessions"],
        transformResponse: (res: any) => res?.data
      }
    )
  }),
});

export const {
  useCreateSessionMutation,
  useGetSessionsQuery,
  useGetSessionByIdQuery,
  useStartSessionMutation,
  useJoinSessionMutation
} = sessionApi;
