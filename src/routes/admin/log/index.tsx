import { createFileRoute } from "@tanstack/react-router";
import AdminLog from "@/pages/admin/AdminLog";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/admin/log/")({
  component: () => (
    <AdminRoute>
      <AdminLog />
    </AdminRoute>
  ),
});
