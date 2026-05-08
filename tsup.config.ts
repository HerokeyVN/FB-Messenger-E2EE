import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  shims: true,
  sourcemap: true,
  minify: false,
  splitting: false,
});
