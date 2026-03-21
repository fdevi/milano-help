import { useRoleCheck } from "@/hooks/useRoleCheck";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Route guard that allows both admin and moderator roles.
 * Used for moderation pages (annunci, eventi, moderazione).
 */
const ModeratorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdminOrModerator, loading } = useRoleCheck();

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdminOrModerator) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default ModeratorRoute;
