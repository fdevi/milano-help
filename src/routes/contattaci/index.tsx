import { createFileRoute } from "@tanstack/react-router";
import Contattaci from "@/pages/Contattaci";

export const Route = createFileRoute("/contattaci/")({
  component: Contattaci,
});
