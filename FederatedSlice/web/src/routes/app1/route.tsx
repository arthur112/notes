import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "lucide-react";

/** App 1's layout route: its `app` meta is its group in the sidebar and its dashboard tile. */
export const Route = createFileRoute("/app1")({
  staticData: {
    app: {
      title: "App 1",
      description: "Every domain default: full order columns, create and edit orders, customers.",
      icon: AppWindow,
    },
  },
});
