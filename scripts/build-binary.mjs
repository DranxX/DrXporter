import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BINARY_DIR = resolve(ROOT, "vscode-binary");
const OUTPUT_DIR = resolve(ROOT, "output/vscode-binary");

mkdirSync(OUTPUT_DIR, { recursive: true });

console.log("[build:binary] Building VSCode binary...");

try {
  execSync("node esbuild.config.mjs", {
    cwd: BINARY_DIR,
    stdio: "inherit",
  });

  console.log("[build:binary] Binary built -> output/vscode-binary/drxporter-bridge");
} catch (err) {
  console.error("[build:binary] FATAL:", err.message);
  process.exit(1);
}
