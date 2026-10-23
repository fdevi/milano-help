import { createFileRoute } from "@tanstack/react-router";
import Fermate from "@/pages/Fermate";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/fermate/")({
  component: () => (
    <ProtectedRoute>
      <Fermate />
    </ProtectedRoute>
  ),
});
