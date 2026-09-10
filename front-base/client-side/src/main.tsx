import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { ShellProvider } from "./shell/ShellProvider";
import { router } from "./router";
import "./styles.css";

// React Query: retries off so a failed mock request surfaces fast in demos.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ShellProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="bottom-right" />
      </ShellProvider>
    </QueryClientProvider>
  </StrictMode>,
);
