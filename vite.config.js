import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs keep local previews and the GitHub Pages project path
  // working from the same build output.
  base: "./",
  server: {
    port: 8090,
    strictPort: true,
  },
  preview: {
    port: 8090,
    strictPort: true,
  },
});
