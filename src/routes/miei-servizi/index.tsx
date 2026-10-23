import { createFileRoute } from "@tanstack/react-router";
import MieiServizi from "@/pages/MieiServizi";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/miei-servizi/")({
  component: () => (
    <ProtectedRoute>
      <MieiServizi />
    </ProtectedRoute>
  ),
});
