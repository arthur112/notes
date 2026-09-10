import { createRootRoute } from "@tanstack/react-router";

import { AppFrame } from "../shell/AppFrame";

export const Route = createRootRoute({
  component: AppFrame,
});
