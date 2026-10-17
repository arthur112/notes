import { createFileRoute, redirect } from "@tanstack/react-router";

/** The app has two domains; the root picks one. */
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/orders" });
  },
});
