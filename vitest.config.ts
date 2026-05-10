import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/db/seed/**",
        "src/instrumentation.ts",
        "src/app/**/layout.tsx",
        "src/app/**/page.tsx",
        // Framework wiring — verified by integration / E2E, not unit tests.
        "src/middleware.ts",
        "src/app/**/route.ts",
        "src/lib/auth.ts",
        "src/lib/auth.config.ts",
        // Declarative Drizzle schema; assertions live in tests/db/schema.test.ts.
        "src/db/schema.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
