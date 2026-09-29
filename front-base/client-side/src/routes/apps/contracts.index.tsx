import { createFileRoute, redirect } from "@tanstack/react-router";

import { DEFAULT_CONTRACT_NO } from "../../shared/domain/contracts";

/**
 * No list page in this app: the index redirects straight to the seeded demo
 * contract (`replace`, so Back never lands on the redirect).
 */
export const Route = createFileRoute("/apps/contracts/")({
  beforeLoad: () => {
    throw redirect({
      to: "/apps/contracts/$contractNo",
      params: { contractNo: DEFAULT_CONTRACT_NO },
      replace: true,
    });
  },
});
