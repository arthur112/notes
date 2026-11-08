import { createFileRoute } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";

/** On the layout, so the list, the new form and an order all read "App 1 / Orders". */
export const Route = createFileRoute("/app1/orders")({
  staticData: { page: { title: "Orders", icon: ReceiptText } },
});
