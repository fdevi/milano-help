import { createFileRoute } from "@tanstack/react-router";
import Servizi from "@/pages/Servizi";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/servizi/")({
  component: () => (
    <ProtectedRoute>
      <Servizi />
    </ProtectedRoute>
  ),
});
