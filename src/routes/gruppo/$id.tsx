import { createFileRoute } from "@tanstack/react-router";
import GruppoDetail from "@/pages/GruppoDetail";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/gruppo/$id")({
  component: () => (
    <ProtectedRoute>
      <GruppoDetail />
    </ProtectedRoute>
  ),
});
