import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profileComplete } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to complete profile if incomplete (but not if already on that page)
  if (profileComplete === false && location.pathname !== "/completa-profilo") {
    return <Navigate to="/completa-profilo" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
