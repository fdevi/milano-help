import { createFileRoute } from "@tanstack/react-router";
import Eventi from "@/pages/Eventi";

export const Route = createFileRoute("/eventi/")({
  component: Eventi,
});
