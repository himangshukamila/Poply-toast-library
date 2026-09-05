import { defineConfig } from "vitest/config";

// test configuration with jsdom environment for react rendering tests
export default defineConfig({
  root: ".",
  test: {
    environment: "jsdom",
    globals: true,
  },
});
