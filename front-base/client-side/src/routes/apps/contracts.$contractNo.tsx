import { createFileRoute } from "@tanstack/react-router";

import { ContractDetailPage } from "../../apps/contracts/features/contract-detail/pages/contract-detail-page";

/** The contract record page, nested under the Contracts layout at `/apps/contracts`. */
export const Route = createFileRoute("/apps/contracts/$contractNo")({
  component: ContractDetailPage,
});
