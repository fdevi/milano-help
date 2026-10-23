import { createFileRoute } from "@tanstack/react-router";
import NuovoServizio from "@/pages/NuovoServizio";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/nuovo-servizio/")({
  component: () => (
    <ProtectedRoute>
      <NuovoServizio />
    </ProtectedRoute>
  ),
});
