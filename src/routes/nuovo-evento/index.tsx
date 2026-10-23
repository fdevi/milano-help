import { createFileRoute } from "@tanstack/react-router";
import NuovoEvento from "@/pages/NuovoEvento";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/nuovo-evento/")({
  component: () => (
    <ProtectedRoute>
      <NuovoEvento />
    </ProtectedRoute>
  ),
});
