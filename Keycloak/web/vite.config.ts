import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_OIDC_AUTHORITY": JSON.stringify(
      process.env.VITE_OIDC_AUTHORITY ?? "https://localhost:8080/realms/poc"
    ),
    "import.meta.env.VITE_OIDC_CLIENT_ID": JSON.stringify(
      process.env.VITE_OIDC_CLIENT_ID ?? "poc-spa"
    ),
    "import.meta.env.VITE_API1_URL": JSON.stringify(
      process.env.services__api1__http__0 ?? "http://localhost:5001"
    ),
  },
  server: {
    port: Number(process.env.PORT ?? 5173),
    strictPort: true,
  },
});
