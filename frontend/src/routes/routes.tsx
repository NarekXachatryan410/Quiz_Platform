import { createBrowserRouter, redirect } from "react-router-dom";
import LoginPage from "../pages/login";
import { ProtectedRoute } from "../ProtectedRoutes";
import JoinRoomPage from "../pages/joinRoom";
import AdminDashboard from "../pages/dashboard";
import SessionRoomPage from "../pages/sessionRoom";
import ParticipantSessionPage from "../pages/participantSession";

export const routes = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />
  },
  {
    path: '/join',
    element: <JoinRoomPage />
  },
  {
    path: '/admin/dashboard',
    element: <ProtectedRoute>
      <AdminDashboard/>
    </ProtectedRoute>
  },
  {
    path: '/sessions/:id',
    element: <SessionRoomPage />
  },
  {
    path: '/play/:id',
    element: <ParticipantSessionPage />
  },
  {
    path: "*",
    loader: () => redirect("/"),
  },
])
