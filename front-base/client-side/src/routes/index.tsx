import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";

import { Dashboard } from "../shell/Dashboard";

export const Route = createFileRoute("/")({
  component: Dashboard,
  staticData: {
    nav: {
      title: "Dashboard",
      description: "Overview of the platform and its apps.",
      group: "Platform",
      icon: LayoutDashboard,
    },
  },
});
