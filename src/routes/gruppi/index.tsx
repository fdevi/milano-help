import { createFileRoute } from "@tanstack/react-router";
import Gruppi from "@/pages/Gruppi";

export const Route = createFileRoute("/gruppi/")({
  component: Gruppi,
});
