import { resolve } from "node:path";
import { mkdirSync } from "node:fs";

const ROOT = resolve(import.meta.dirname, "..");

mkdirSync(resolve(ROOT, "output/roblox-plugin"), { recursive: true });
mkdirSync(resolve(ROOT, "output/vscode-binary"), { recursive: true });
mkdirSync(resolve(ROOT, "output/manifests"), { recursive: true });
mkdirSync(resolve(ROOT, "output/logs"), { recursive: true });

console.log("[build:all] Starting full build...\n");

try {
  const { execSync } = await import("node:child_process");

  console.log("=== Phase 1: Plugin ===");
  execSync("node scripts/build-plugin.mjs", { cwd: ROOT, stdio: "inherit" });

  console.log("\n=== Phase 2: Binary ===");
  execSync("node scripts/build-binary.mjs", { cwd: ROOT, stdio: "inherit" });

  console.log("\n[build:all] Full build complete.");
} catch (err) {
  console.error("[build:all] FATAL:", err.message);
  process.exit(1);
}
