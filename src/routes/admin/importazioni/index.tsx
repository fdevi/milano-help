import { createFileRoute } from "@tanstack/react-router";
import AdminImportazioni from "@/pages/admin/AdminImportazioni";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/admin/importazioni/")({
  component: () => (
    <AdminRoute>
      <AdminImportazioni />
    </AdminRoute>
  ),
});
