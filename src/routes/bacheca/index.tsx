import { createFileRoute } from "@tanstack/react-router";
import Bacheca from "@/pages/Bacheca";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/bacheca/")({
  component: () => (
    <ProtectedRoute>
      <Bacheca />
    </ProtectedRoute>
  ),
});
