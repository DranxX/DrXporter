import type { ParsedArgs } from "./args";
import { createServer, type BridgeServer } from "../bridge/server";
import { createLogger } from "../logging/logger";
import { resolveFlag } from "./flags";

const logger = createLogger("commands");
const DEFAULT_BRIDGE_PORT = 51234;

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
  const port = Number(resolveFlag(args.flags, "port", DEFAULT_BRIDGE_PORT));
  const host = String(resolveFlag(args.flags, "host", "127.0.0.1"));

  logger.info(`Starting bridge server on ${host}:${port}`);
  const activeServer = await startServerWithPortFallback(host, port);
  await waitForShutdown(activeServer.server, activeServer.port);
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

async function waitForShutdown(server: BridgeServer, port: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let shuttingDown = false;
    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGBREAK"];

    if (process.platform !== "win32") {
      signals.push("SIGTSTP");
    }

    const removeHandlers = () => {
      for (const signal of signals) {
        process.off(signal, handleSignal);
      }
    };

    const handleSignal = (signal: NodeJS.Signals) => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      removeHandlers();
      logger.info(`Received ${signal}, shutting down bridge server on port ${port}...`);

      const forceExitTimer = setTimeout(() => {
        logger.error("Shutdown timed out, forcing exit.");
        process.exit(1);
      }, 2_000);
      forceExitTimer.unref?.();

      void server
        .stop()
        .then(() => {
          clearTimeout(forceExitTimer);
          logger.info(`Bridge server stopped. Port ${port} released.`);
          resolve();
          process.exit(0);
        })
        .catch((err) => {
          clearTimeout(forceExitTimer);
          const message = err instanceof Error ? err.message : String(err);
          logger.error(`Shutdown failed: ${message}`);
          reject(err);
          process.exit(1);
        });
    };

    for (const signal of signals) {
      process.on(signal, handleSignal);
    }
  });
}

async function startServerWithPortFallback(
  host: string,
  startPort: number,
): Promise<{ server: BridgeServer; port: number }> {
  for (let port = startPort; port <= 65535; port++) {
    const server = createServer({ port, host });
    try {
      await server.start();
      if (port !== startPort) {
        logger.warn(`Port ${startPort} is unavailable; using ${port} instead.`);
        logger.warn(`Use port ${port} in the Roblox plugin connect screen.`);
      }
      return { server, port };
    } catch (err) {
      if (!isNodeError(err) || err.code !== "EADDRINUSE") {
        throw err;
      }

      if (port === 65535) {
        throw err;
      }

      logger.warn(`Port ${port} is unavailable; trying ${port + 1}...`);
    }
  }

  throw new Error(`No available bridge port found from ${startPort} to 65535`);
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
