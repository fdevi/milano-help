import { createFileRoute } from "@tanstack/react-router";
import AdminNewsletter from "@/pages/admin/AdminNewsletter";
import AdminRoute from "@/components/AdminRoute";

export const Route = createFileRoute("/admin/newsletter/")({
  component: () => (
    <AdminRoute>
      <AdminNewsletter />
    </AdminRoute>
  ),
});
