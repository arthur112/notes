import { createFileRoute } from "@tanstack/react-router";
import { Shapes } from "lucide-react";
import { App } from "../../apps/showcase/ShowcaseApp";

export const Route = createFileRoute("/apps/showcase")({
  component: App,
  staticData: {
    nav: {
      title: "Components",
      description:
        "Component gallery: stat cards and a composite search bar (input, month picker, searchable multi-select).",
      group: "App 3",
      icon: Shapes,
    },
  },
});
