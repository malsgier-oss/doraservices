import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Avoid overly-broad substring matches (e.g. "react" matches many deps)
          const nm = id.split("node_modules/")[1] ?? id;

          if (/^(react|react-dom|scheduler)\//.test(nm)) return "react";
          if (/^react-router/.test(nm)) return "router";

          if (nm.includes("@tanstack/")) return "tanstack";
          if (nm.includes("@supabase/")) return "supabase";
          if (nm.includes("mapbox-gl/")) return "mapbox";
          if (nm.includes("recharts/") || nm.includes("d3-")) return "charts";

          return "vendor";
        },
      },
    },
  },
}));
