import { createFileRoute } from "@tanstack/react-router";
import MieiAnnunci from "@/pages/MieiAnnunci";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/miei-annunci/")({
  component: () => (
    <ProtectedRoute>
      <MieiAnnunci />
    </ProtectedRoute>
  ),
});
