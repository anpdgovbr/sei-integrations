import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./coverage/junit.xml",
    },
    coverage: {
      enabled: false,
      provider: "v8",
      reporter: ["text", "json", "html", "cobertura", "lcov"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "packages/*/src/**/*.test.ts",
        "packages/*/src/**/*.spec.ts",
        "packages/*/src/types.ts",
        "packages/*/src/index.ts",
      ],
      thresholds: {
        statements: 80,
        functions: 80,
        lines: 80,
        branches: 45,
      },
    },
  },
})
