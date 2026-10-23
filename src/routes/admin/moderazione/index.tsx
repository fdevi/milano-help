import { createFileRoute } from "@tanstack/react-router";
import AdminModerazione from "@/pages/admin/AdminModerazione";
import ModeratorRoute from "@/components/ModeratorRoute";

export const Route = createFileRoute("/admin/moderazione/")({
  component: () => (
    <ModeratorRoute>
      <AdminModerazione />
    </ModeratorRoute>
  ),
});
