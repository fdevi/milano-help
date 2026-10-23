import { createFileRoute } from "@tanstack/react-router";
import NuovoAnnuncio from "@/pages/NuovoAnnuncio";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/nuovo-annuncio/")({
  component: () => (
    <ProtectedRoute>
      <NuovoAnnuncio />
    </ProtectedRoute>
  ),
});
