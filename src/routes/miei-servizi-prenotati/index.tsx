import { createFileRoute } from "@tanstack/react-router";
import MieiServiziPrenotati from "@/pages/MieiServiziPrenotati";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/miei-servizi-prenotati/")({
  component: () => (
    <ProtectedRoute>
      <MieiServiziPrenotati />
    </ProtectedRoute>
  ),
});
