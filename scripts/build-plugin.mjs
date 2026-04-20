import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PLUGIN_DIR = resolve(ROOT, "roblox-plugin");
const OUTPUT_DIR = resolve(ROOT, "output/roblox-plugin");

mkdirSync(OUTPUT_DIR, { recursive: true });

console.log("[build:plugin] Building Roblox plugin...");

try {
  if (!existsSync(resolve(PLUGIN_DIR, "default.project.json"))) {
    console.error("[build:plugin] ERROR: default.project.json not found in roblox-plugin/");
    process.exit(1);
  }

  execSync(`rojo build default.project.json --output "${resolve(OUTPUT_DIR, "Drxporter.rbxm")}"`, {
    cwd: PLUGIN_DIR,
    stdio: "inherit",
  });

  console.log("[build:plugin] Plugin built -> output/roblox-plugin/Drxporter.rbxm");
} catch (err) {
  console.error("[build:plugin] FATAL:", err.message);
  process.exit(1);
}
