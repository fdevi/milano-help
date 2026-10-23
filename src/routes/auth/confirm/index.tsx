import { createFileRoute } from "@tanstack/react-router";
import ConfirmEmail from "@/pages/ConfirmEmail";

export const Route = createFileRoute("/auth/confirm/")({
  component: ConfirmEmail,
});
