import { createFileRoute } from "@tanstack/react-router";
import MieiPrenotazioni from "@/pages/MieiPrenotazioni";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/miei-prenotazioni/")({
  component: () => (
    <ProtectedRoute>
      <MieiPrenotazioni />
    </ProtectedRoute>
  ),
});
