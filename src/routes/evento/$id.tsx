import { createFileRoute } from "@tanstack/react-router";
import EventoPage from "@/pages/EventoPage";

export const Route = createFileRoute("/evento/$id")({
  component: EventoPage,
});
