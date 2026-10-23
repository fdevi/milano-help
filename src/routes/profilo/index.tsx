import { createFileRoute } from "@tanstack/react-router";
import Profilo from "@/pages/Profilo";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/profilo/")({
  component: () => (
    <ProtectedRoute>
      <Profilo />
    </ProtectedRoute>
  ),
});
