import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Provide safe defaults for tests (avoids requiring local .env files).
const TEST_SUPABASE_URL = process.env.VITE_DORA_SUPABASE_URL ?? "http://localhost:54321";
const TEST_SUPABASE_ANON_KEY = process.env.VITE_DORA_SUPABASE_ANON_KEY ?? "test-anon-key";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_DORA_SUPABASE_URL": JSON.stringify(TEST_SUPABASE_URL),
    "import.meta.env.VITE_DORA_SUPABASE_ANON_KEY": JSON.stringify(TEST_SUPABASE_ANON_KEY),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/test/**/*.test.{ts,tsx}"],
  },
});

