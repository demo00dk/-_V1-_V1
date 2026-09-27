import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Legacy downloads and old source copies are private working materials.
  publicDir: false,
  server: {
    watch: { ignored: ["**/output/**", "**/.tools/**"] },
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
});
