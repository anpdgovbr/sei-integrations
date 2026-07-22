import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts", "src/mappers.ts", "src/soap.ts", "src/types.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
})
