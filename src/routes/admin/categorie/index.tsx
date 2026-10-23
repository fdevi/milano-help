import { createFileRoute } from "@tanstack/react-router";
import AdminCategorie from "@/pages/admin/AdminCategorie";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/admin/categorie/")({
  component: () => (
    <AdminRoute>
      <AdminCategorie />
    </AdminRoute>
  ),
});
