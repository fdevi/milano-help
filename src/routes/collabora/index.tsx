import { createFileRoute } from "@tanstack/react-router";
import Collabora from "@/pages/Collabora";

export const Route = createFileRoute("/collabora/")({
  component: Collabora,
});
