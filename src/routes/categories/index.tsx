import { createFileRoute } from "@tanstack/react-router";
import Categories from "@/pages/Categories";

export const Route = createFileRoute("/categories/")({
  component: Categories,
});
