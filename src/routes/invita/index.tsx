import { createFileRoute } from "@tanstack/react-router";
import InvitaAmico from "@/pages/InvitaAmico";

export const Route = createFileRoute("/invita/")({
  component: InvitaAmico,
});
