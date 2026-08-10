import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_KEYCLOAK_URL": JSON.stringify(
      process.env.services__keycloak__https__0 ??
      process.env.services__keycloak__http__0 ??
      "https://localhost:8080"
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
