import { createFileRoute } from "@tanstack/react-router";
import AdminProfiloUtente from "@/pages/admin/AdminProfiloUtente";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/admin/utenti/$userId")({
  component: () => (
    <AdminRoute>
      <AdminProfiloUtente />
    </AdminRoute>
  ),
});
