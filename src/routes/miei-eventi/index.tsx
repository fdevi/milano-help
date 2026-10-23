import { createFileRoute } from "@tanstack/react-router";
import MieiEventi from "@/pages/MieiEventi";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/miei-eventi/")({
  component: () => (
    <ProtectedRoute>
      <MieiEventi />
    </ProtectedRoute>
  ),
});
