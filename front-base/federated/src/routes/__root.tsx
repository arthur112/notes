import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import { AppFrame } from "@/shell/app-frame";

/** The shell wraps every route; loaders reach the one `QueryClient` through the context. */
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: AppFrame,
});
