import { createFileRoute } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";
import { App } from "../../apps/invoices/InvoicesApp";

// With `autoCodeSplitting: true` in the router Vite plugin, `component`
// (and the whole micro-app module graph behind it) is automatically split
// into a chunk the browser only fetches when this route is first matched.
export const Route = createFileRoute("/apps/invoices")({
  component: App,
  staticData: {
    nav: {
      title: "Invoices",
      description:
        "Browse and select invoices. Publishes an event to the shell on selection.",
      group: "App 1",
      icon: ReceiptText,
    },
  },
});
