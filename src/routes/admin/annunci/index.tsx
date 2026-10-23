import { createFileRoute } from "@tanstack/react-router";
import AdminAnnunci from "@/pages/admin/AdminAnnunci";
import ModeratorRoute from "@/components/ModeratorRoute";

export const Route = createFileRoute("/admin/annunci/")({
  component: () => (
    <ModeratorRoute>
      <AdminAnnunci />
    </ModeratorRoute>
  ),
});
