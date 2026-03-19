import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { SessionUser } from "@statisticalsystem/shared";
import { LoadingScreen } from "./LoadingScreen";
import { getAdminMe } from "../services/admin";
import { getUserMe } from "../services/user";

type RequireSessionProps = {
  role: "admin" | "user";
  redirectTo: string;
};

export function RequireSession({ role, redirectTo }: RequireSessionProps) {
  const [state, setState] = useState<{ loading: boolean; user: SessionUser | null }>({
    loading: true,
    user: null
  });

  useEffect(() => {
    let mounted = true;
    const loader = role === "admin" ? getAdminMe : getUserMe;

    loader()
      .then((user) => {
        if (mounted) {
          setState({ loading: false, user });
        }
      })
      .catch(() => {
        if (mounted) {
          setState({ loading: false, user: null });
        }
      });

    return () => {
      mounted = false;
    };
  }, [role]);

  if (state.loading) {
    return <LoadingScreen />;
  }

  if (!state.user) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
