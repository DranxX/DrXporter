import { build } from "esbuild";
import { resolve } from "node:path";
import { chmodSync } from "node:fs";

const ROOT = resolve(import.meta.dirname);
const PROJECT_ROOT = resolve(ROOT, "..");
const OUTPUT = resolve(PROJECT_ROOT, "output", "vscode-binary");
const outfile = resolve(OUTPUT, "drxporter");

await build({
  entryPoints: [resolve(ROOT, "bin/drxporter.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  sourcemap: false,
  minify: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});

chmodSync(outfile, 0o755);

console.log("[esbuild] Binary built -> output/vscode-binary/drxporter");
