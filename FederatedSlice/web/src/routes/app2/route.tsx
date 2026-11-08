import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";

/** App 2's layout route: its `app` meta is its group in the sidebar and its dashboard tile. */
export const Route = createFileRoute("/app2")({
  staticData: {
    app: {
      title: "App 2",
      description:
        "Its own lean order columns, no order creation; customers as the domain ships them.",
      icon: LayoutGrid,
    },
  },
});
