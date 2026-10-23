import { createFileRoute } from "@tanstack/react-router";
import Chat from "@/pages/Chat";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/chat/$id")({
  component: () => (
    <ProtectedRoute>
      <Chat />
    </ProtectedRoute>
  ),
});
