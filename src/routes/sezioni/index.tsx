import { createFileRoute } from "@tanstack/react-router";
import Sezioni from "@/pages/Sezioni";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/sezioni/")({
  component: () => (
    <ProtectedRoute>
      <Sezioni />
    </ProtectedRoute>
  ),
});
