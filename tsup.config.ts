import { defineConfig } from "tsup";

// configuration for generating dual esm and cjs build with typescript declarations
export default defineConfig({
  entry: ["index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
});
