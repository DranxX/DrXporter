import { build } from "esbuild";
import { isAbsolute, resolve } from "node:path";
import { chmodSync } from "node:fs";

const ROOT = resolve(import.meta.dirname);
const PROJECT_ROOT = resolve(ROOT, "..");
const OUTPUT = resolve(PROJECT_ROOT, "output", "vscode-binary");
const args = process.argv.slice(2);
const outfileArg = readArgValue("--outfile");
const includeBanner = !args.includes("--no-banner");
const outfile = outfileArg
  ? (isAbsolute(outfileArg) ? outfileArg : resolve(PROJECT_ROOT, outfileArg))
  : resolve(OUTPUT, "drxporter");

await build({
  entryPoints: [resolve(ROOT, "bin/drxporter.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  sourcemap: false,
  minify: true,
  ...(includeBanner
    ? {
        banner: {
          js: "#!/usr/bin/env node",
        },
      }
    : {}),
});

if (includeBanner) {
  chmodSync(outfile, 0o755);
}

console.log(`[esbuild] Bundle built -> ${outfile}`);

function readArgValue(flag) {
  const inlineArg = args.find((arg) => arg.startsWith(`${flag}=`));
  if (inlineArg) {
    return inlineArg.slice(flag.length + 1);
  }

  const index = args.indexOf(flag);
  if (index >= 0) {
    return args[index + 1];
  }

  return null;
}
