import { useAuth } from "@/context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user || user.role !== "admin") {
    return <Navigate to="/app" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
