import { createFileRoute } from "@tanstack/react-router";
import ImportFermate from "@/pages/ImportFermate";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/import-fermate/")({
  component: () => (
    <AdminRoute>
      <ImportFermate />
    </AdminRoute>
  ),
});
