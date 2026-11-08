import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// File-based routes: src/routes/** becomes the route tree; autoCodeSplitting
// turns each route `component` into its own lazy chunk.
//
// /api goes to the .NET API: Aspire's `WithReference(api)` sets services__api__http__0;
// without Aspire, the API's own launch profile (`dotnet run --project src/Api`). The OIDC
// settings come from VITE_OIDC_* (the AppHost sets them; `.env` has the same defaults).
export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // Fixed: http://localhost:5173/* is the redirect URI the Keycloak realm allows.
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    proxy: { "/api": process.env.services__api__http__0 ?? "http://localhost:5246" },
  },
});
