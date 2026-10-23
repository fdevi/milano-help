import { createFileRoute } from "@tanstack/react-router";
import AdminApprovazioneCategorie from "@/pages/admin/AdminApprovazioneCategorie";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/admin/approvazione-categorie/")({
  component: () => (
    <AdminRoute>
      <AdminApprovazioneCategorie />
    </AdminRoute>
  ),
});
