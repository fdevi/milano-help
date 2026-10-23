import { createFileRoute } from "@tanstack/react-router";
import ConfirmEmailChange from "@/pages/ConfirmEmailChange";

export const Route = createFileRoute("/confirm-email-change/")({
  component: ConfirmEmailChange,
});
