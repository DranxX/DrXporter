import type { ParsedArgs } from "./args";
import { createServer } from "../bridge/server";
import { createLogger } from "../logging/logger";
import { resolveFlag } from "./flags";

const logger = createLogger("commands");

const COMMANDS: Record<string, (args: ParsedArgs) => Promise<void>> = {
  serve: handleServe,
  init: handleServe,
  reset: handleReset,
  "inspect-cache": handleInspectCache,
  "build-plugin": handleBuildPlugin,
  "build-binary": handleBuildBinary,
  "build-all": handleBuildAll,
};

export async function executeCommand(args: ParsedArgs): Promise<void> {
  const handler = COMMANDS[args.command];
  if (!handler) {
    logger.error(`Unknown command: ${args.command}`);
    process.exit(1);
  }
  await handler(args);
}

async function handleServe(args: ParsedArgs): Promise<void> {
  const port = Number(resolveFlag(args.flags, "port", 34872));
  const host = String(resolveFlag(args.flags, "host", "127.0.0.1"));

  logger.info(`Starting bridge server on ${host}:${port}`);
  const server = createServer({ port, host });
  await server.start();
}

async function handleReset(_args: ParsedArgs): Promise<void> {
  const { resolve } = await import("node:path");
  const { existsSync, rmSync, readdirSync } = await import("node:fs");

  const cwd = process.cwd();
  const cacheDir = resolve(cwd, ".drxporter-cache");
  const srcDir = resolve(cwd, "src");

  if (existsSync(cacheDir)) {
    const files = readdirSync(cacheDir);
    let entryCount = 0;
    for (const f of files) {
      if (f.endsWith(".json")) entryCount++;
    }
    rmSync(cacheDir, { recursive: true, force: true });
    logger.info(`Deleted cache directory (${entryCount} cache files)`);
  } else {
    logger.info("No cache directory found");
  }

  if (existsSync(srcDir)) {
    rmSync(srcDir, { recursive: true, force: true });
    logger.info("Deleted src/ directory");
  } else {
    logger.info("No src/ directory found");
  }

  logger.info("Reset complete. All cache, UUIDs, and exported files cleared.");
  logger.info("Run ./drxporter and re-export from Studio to start fresh.");
}

async function handleInspectCache(_args: ParsedArgs): Promise<void> {
  const { CacheStore } = await import("../cache/cache-store");
  const { resolve } = await import("node:path");
  const { existsSync, readdirSync } = await import("node:fs");

  const cacheDir = resolve(process.cwd(), ".drxporter-cache");
  if (!existsSync(cacheDir)) {
    logger.info("No cache directory found.");
    return;
  }

  const store = new CacheStore(cacheDir);
  const files = readdirSync(cacheDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    logger.info("Cache directory is empty.");
    return;
  }

  for (const file of files) {
    const parts = file.replace(".json", "").split("_");
    if (parts.length !== 2) continue;
    const key = { gameId: parts[0], placeId: parts[1] };
    const cache = store.load(key);
    const entryCount = Object.keys(cache.entries).length;
    const scriptCount = Object.values(cache.entries).filter(
      (e: any) => e.className === "Script" || e.className === "LocalScript" || e.className === "ModuleScript"
    ).length;
    const instanceCount = entryCount - scriptCount;
    logger.info(
      `Game: ${key.gameId} | Place: ${key.placeId} | ${instanceCount} instances, ${scriptCount} scripts | Updated: ${new Date(cache.updatedAt).toISOString()}`
    );
  }
}

async function handleBuildPlugin(_args: ParsedArgs): Promise<void> {
  const { execSync } = await import("node:child_process");
  logger.info("Building plugin...");
  execSync("node ../scripts/build-plugin.mjs", { stdio: "inherit", cwd: process.cwd() });
}

async function handleBuildBinary(_args: ParsedArgs): Promise<void> {
  const { execSync } = await import("node:child_process");
  logger.info("Building binary...");
  execSync("node ../scripts/build-binary.mjs", { stdio: "inherit", cwd: process.cwd() });
}

async function handleBuildAll(_args: ParsedArgs): Promise<void> {
  const { execSync } = await import("node:child_process");
  logger.info("Building all...");
  execSync("node ../scripts/build-all.mjs", { stdio: "inherit", cwd: process.cwd() });
}
