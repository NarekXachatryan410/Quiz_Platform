import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import type { RootState } from "./store";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem("token")

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
