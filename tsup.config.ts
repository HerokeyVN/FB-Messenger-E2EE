import { defineConfig } from "tsup";
import { cp } from "fs/promises";
import { join } from "path";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  shims: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  async onSuccess() {
    // Copy proto files to package root /proto/ so bundled code can find them
    // Bundle resolves proto at: path.join(__dirname, "../proto", target)
    // where __dirname = dist/ → so ../proto = package_root/proto/
    const src = join("src", "e2ee", "message", "proto");
    const dest = join("proto");
    await cp(src, dest, { recursive: true });
    console.log("✓ Copied proto/ files to package root");
  },
});
