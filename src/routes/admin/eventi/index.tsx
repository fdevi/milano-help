import { createFileRoute } from "@tanstack/react-router";
import AdminEventi from "@/pages/admin/AdminEventi";
import ModeratorRoute from "@/components/ModeratorRoute";

export const Route = createFileRoute("/admin/eventi/")({
  component: () => (
    <ModeratorRoute>
      <AdminEventi />
    </ModeratorRoute>
  ),
});
