import { createFileRoute } from "@tanstack/react-router";
import ModificaAnnuncio from "@/pages/ModificaAnnuncio";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/modifica-annuncio/$id")({
  component: () => (
    <ProtectedRoute>
      <ModificaAnnuncio />
    </ProtectedRoute>
  ),
});
