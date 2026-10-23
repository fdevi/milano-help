import { createFileRoute } from "@tanstack/react-router";
import CompletaProfilo from "@/pages/CompletaProfilo";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/completa-profilo/")({
  component: () => (
    <ProtectedRoute>
      <CompletaProfilo />
    </ProtectedRoute>
  ),
});
