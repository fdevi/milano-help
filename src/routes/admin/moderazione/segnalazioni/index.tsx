import { createFileRoute } from "@tanstack/react-router";
import AdminSegnalazioni from "@/pages/admin/AdminSegnalazioni";
import ModeratorRoute from "@/components/ModeratorRoute";

export const Route = createFileRoute("/admin/moderazione/segnalazioni/")({
  component: () => (
    <ModeratorRoute>
      <AdminSegnalazioni />
    </ModeratorRoute>
  ),
});
