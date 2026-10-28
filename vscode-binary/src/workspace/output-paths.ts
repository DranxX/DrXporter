import { resolve } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

export function ensureOutputDirs(root: string): void {
  const dirs = [
    resolve(root, "output/roblox-plugin"),
    resolve(root, "output/vscode-binary"),
    resolve(root, "output/manifests"),
    resolve(root, "output/logs"),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}
