import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function resolveProjectRoot(startDir?: string): string {
  const dir = startDir || process.cwd();
  const configPath = resolve(dir, "drxporter.config.json");
  if (existsSync(configPath)) return dir;
  return dir;
}

export function isValidProject(dir: string): boolean {
  return existsSync(resolve(dir, "roblox-plugin")) || existsSync(resolve(dir, "vscode-binary"));
}
