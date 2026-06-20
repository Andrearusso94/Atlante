import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev loop: il Worker (wrangler dev) gira sulla 8787; Vite proxa /api/* così
// l'IA si testa in locale esattamente come in produzione (vedi README-INTEGRAZIONE.md).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
