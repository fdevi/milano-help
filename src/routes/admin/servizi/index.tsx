import { createFileRoute } from "@tanstack/react-router";
import AdminServizi from "@/pages/admin/AdminServizi";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/admin/servizi/")({
  component: () => (
    <AdminRoute>
      <AdminServizi />
    </AdminRoute>
  ),
});
