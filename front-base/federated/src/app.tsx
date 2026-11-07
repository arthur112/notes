import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { queryClient, router } from "./router";
import { ShellProvider } from "./shell/shell-provider";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ShellProvider>
        <RouterProvider router={router} />
      </ShellProvider>
    </QueryClientProvider>
  </StrictMode>,
);
