import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "./ui/Spinner";
import type { Role } from "../types";

/** Requires a logged-in user, optionally with a specific role. Wrong role → vacations page. */
export function ProtectedRoute({ role }: { role?: Role }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <PageLoader label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to="/vacations" replace />;
  return <Outlet />;
}

/** Login/register are only for guests; signed-in users go to the vacations page. */
export function GuestRoute() {
  const { user, initializing } = useAuth();
  if (initializing) return <PageLoader />;
  if (user) return <Navigate to="/vacations" replace />;
  return <Outlet />;
}
