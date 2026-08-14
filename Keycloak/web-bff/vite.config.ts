import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The SPA talks to the BFF same-origin via this proxy; changeOrigin makes the
// BFF see its own host so OIDC redirect URIs stay stable.
const bffUrl = process.env.services__bff__http__0 ?? "http://localhost:5180";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT ?? 5174),
    strictPort: true,
    proxy: {
      "/api": { target: bffUrl, changeOrigin: true },
      "/signin-oidc": { target: bffUrl, changeOrigin: true },
    },
  },
});
