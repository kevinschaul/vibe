import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Each test file gets a fresh module registry
    isolate: true,
    // By default, exclude integration tests (they need live credentials)
    exclude: ["**/node_modules/**", "**/integration/**"],
    environmentOptions: {
      // jsdom is used for store tests via @vitest-environment jsdom docblock
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/app/api/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.integration.test.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
