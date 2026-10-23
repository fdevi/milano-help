import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import { Navigate } from "@/lib/router-compat";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import ModeratorRoute from "@/components/ModeratorRoute";

const AdminEntryRoute = () => {
  const { isAdmin } = useRoleCheck();
  if (isAdmin) return <AdminDashboard />;
  return <Navigate to="/admin/moderazione" replace />;
};

export const Route = createFileRoute("/admin/")({
  component: () => (
    <ModeratorRoute>
      <AdminEntryRoute />
    </ModeratorRoute>
  ),
});
