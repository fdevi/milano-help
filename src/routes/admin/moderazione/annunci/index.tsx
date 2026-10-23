import { createFileRoute } from "@tanstack/react-router";
import AdminModAnnunci from "@/pages/admin/AdminModAnnunci";
import ModeratorRoute from "@/components/ModeratorRoute";

export const Route = createFileRoute("/admin/moderazione/annunci/")({
  component: () => (
    <ModeratorRoute>
      <AdminModAnnunci />
    </ModeratorRoute>
  ),
});
