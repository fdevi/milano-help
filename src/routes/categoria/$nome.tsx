import { createFileRoute } from "@tanstack/react-router";
import CategoriaPage from "@/pages/CategoriaPage";

export const Route = createFileRoute("/categoria/$nome")({
  component: CategoriaPage,
});
