import { resolve } from "node:path";

export function resolveOutputRoot(base: string): string {
  return resolve(base, "output");
}

export function resolvePluginOutput(base: string): string {
  return resolve(base, "output", "roblox-plugin");
}

export function resolveBinaryOutput(base: string): string {
  return resolve(base, "output", "vscode-binary");
}

export function resolveManifestOutput(base: string): string {
  return resolve(base, "output", "manifests");
}

export function resolveLogOutput(base: string): string {
  return resolve(base, "output", "logs");
}

export function resolveCacheDir(base: string, cacheDir: string): string {
  return resolve(base, cacheDir);
}
