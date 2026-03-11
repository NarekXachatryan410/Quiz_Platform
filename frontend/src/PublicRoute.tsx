import { type ReactNode } from "react";
import { useSelector } from "react-redux";
import { type RootState } from "./store";
import { Navigate } from "react-router-dom";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function PublicRoute({children}: ProtectedRouteProps)  {
    const token = useSelector((state: RootState) => state.user.token)

    if(!token) {
        return <Navigate to="/admin/dashboard"/>
    }

    return <>{children}</>
}