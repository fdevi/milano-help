import { createFileRoute } from "@tanstack/react-router";
import AdminPrenotazioni from "@/pages/admin/AdminPrenotazioni";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/admin/prenotazioni/")({
  component: () => (
    <AdminRoute>
      <AdminPrenotazioni />
    </AdminRoute>
  ),
});
