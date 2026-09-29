import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Landmark } from "lucide-react";

/**
 * Layout for the Contracts app: the record lives on the `$contractNo` child,
 * the index redirects to the seeded contract (there is no list — yet). Keeping
 * the nav metadata on the layout means the sidebar entry stays
 * `/apps/contracts` (and stays active while the record is open).
 */
export const Route = createFileRoute("/apps/contracts")({
  component: ContractsLayout,
  staticData: {
    nav: {
      title: "Contracts",
      description:
        "The lending desk: a mortgage contract record — origination snapshot, risk grade, live state, claims and modification history.",
      group: "Lending",
      icon: Landmark,
    },
  },
});

function ContractsLayout() {
  return <Outlet />;
}
