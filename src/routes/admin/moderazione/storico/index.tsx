import { createFileRoute } from "@tanstack/react-router";
import AdminModStorico from "@/pages/admin/AdminModStorico";
import ModeratorRoute from "@/components/ModeratorRoute";

export const Route = createFileRoute("/admin/moderazione/storico/")({
  component: () => (
    <ModeratorRoute>
      <AdminModStorico />
    </ModeratorRoute>
  ),
});
