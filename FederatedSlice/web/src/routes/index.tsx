import { createFileRoute } from "@tanstack/react-router";

import { Dashboard } from "@/shell/dashboard";

export const Route = createFileRoute("/")({
  component: Dashboard,
});
