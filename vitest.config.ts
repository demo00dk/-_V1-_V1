import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.mjs"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: [
        "src/domain/{rankings,majors,matching,text,dates}.ts",
        "src/lib/excel.ts",
        "server/{app,repository}.mjs",
      ],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "output/coverage",
      thresholds: { lines: 75, functions: 75, branches: 65, statements: 75 },
    },
  },
});
