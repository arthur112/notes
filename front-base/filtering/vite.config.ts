import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Tests run in Brussels time, so the date filter's UTC bounds don't depend on the machine.
process.env.TZ = "Europe/Brussels";

// File-based routes: src/routes/** becomes the route tree; autoCodeSplitting
// turns each route `component` into its own lazy chunk.
export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
