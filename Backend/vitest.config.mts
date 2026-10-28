import os from "os";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-secret-please-change-0123456789",
      UPLOADS_DIR: path.join(os.tmpdir(), "voyage-test-uploads"),
      ANTHROPIC_API_KEY: "",
    },
  },
});
