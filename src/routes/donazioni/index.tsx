import { createFileRoute } from "@tanstack/react-router";
import Donazioni from "@/pages/Donazioni";

export const Route = createFileRoute("/donazioni/")({
  component: Donazioni,
});
