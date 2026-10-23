import { createFileRoute } from "@tanstack/react-router";
import ServizioPage from "@/pages/ServizioPage";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/servizio/$id")({
  component: () => (
    <ProtectedRoute>
      <ServizioPage />
    </ProtectedRoute>
  ),
});
