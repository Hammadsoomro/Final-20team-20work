import { useAuth } from "@/context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
