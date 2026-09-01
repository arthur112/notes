import { createFileRoute } from "@tanstack/react-router";
import { Shapes } from "lucide-react";
import { App } from "../../apps/showcase/ShowcaseApp";

export const Route = createFileRoute("/apps/showcase")({
  component: App,
  staticData: {
    nav: {
      title: "Components",
      description:
        "Component gallery, stacked comparison: five design takes (editorial, cards, bento, terminal, soft) on the same stats + searchable, filterable project list.",
      group: "App 3",
      icon: Shapes,
    },
  },
});
