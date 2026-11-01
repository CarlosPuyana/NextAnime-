import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "frontend",
  base: "/NextAnime-/",
  plugins: [react()],
  build: { outDir: "../dist/frontend", emptyOutDir: true },
  server: { proxy: { "/api": "http://127.0.0.1:3000" } },
});
