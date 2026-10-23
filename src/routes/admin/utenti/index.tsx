import { createFileRoute } from "@tanstack/react-router";
import AdminUtenti from "@/pages/admin/AdminUtenti";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/admin/utenti/")({
  component: () => (
    <AdminRoute>
      <AdminUtenti />
    </AdminRoute>
  ),
});
