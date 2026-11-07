import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

export const Route = createFileRoute("/app2/customers")({
  staticData: { page: { title: "Customers", icon: Users } },
});
