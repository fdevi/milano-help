import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/home/")({
  component: () => (
    <ProtectedRoute>
      <Home />
    </ProtectedRoute>
  ),
});
