import { createFileRoute } from "@tanstack/react-router";
import { ChartColumn } from "lucide-react";
import { App } from "../../apps/reports/ReportsApp";

export const Route = createFileRoute("/apps/reports")({
  component: App,
  staticData: {
    nav: {
      title: "Reports",
      description:
        "A small chart. Reads the shell event bus to show what other apps did.",
      group: "App 2",
      icon: ChartColumn,
    },
  },
});
