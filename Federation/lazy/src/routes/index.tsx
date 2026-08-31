import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { Dashboard } from "../shell/Dashboard";

export const Route = createFileRoute("/")({
  component: Dashboard,
  // Declaring `nav` here is all it takes for this page to show up in the
  // sidebar and on the dashboard — both are derived from the route tree.
  staticData: {
    nav: {
      title: "Dashboard",
      group: "Acme Suite",
      icon: LayoutDashboard,
    },
  },
});
