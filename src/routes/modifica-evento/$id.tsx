import { createFileRoute } from "@tanstack/react-router";
import ModificaEvento from "@/pages/ModificaEvento";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/modifica-evento/$id")({
  component: () => (
    <ProtectedRoute>
      <ModificaEvento />
    </ProtectedRoute>
  ),
});
