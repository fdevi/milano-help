import { createFileRoute } from "@tanstack/react-router";
import AdminAnnunciSpeciali from "@/pages/admin/AdminAnnunciSpeciali";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/admin/annunci-speciali/")({
  component: () => (
    <AdminRoute>
      <AdminAnnunciSpeciali />
    </AdminRoute>
  ),
});
