import type { RouteResult } from "../router";
import { parseRequest, createResponse, createErrorResponse } from "../protocol";
import type { ImportPullPayload, InstanceJson, ScriptDescriptor } from "@drxporter/shared";
import { INSTANCE_JSON_EXTENSION, isFolderClass, isScriptClass } from "@drxporter/shared";
import { CacheStore } from "../../cache/cache-store";
import { createLogger } from "../../logging/logger";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { reconcileWorkspace } from "../watcher";
import {
  instanceJsonFromEntry,
  readInstanceJsonFile,
  scriptDescriptorFromEntry,
  scriptExtension,
  workspaceFilePath,
} from "../sync-files";

const logger = createLogger("import");

export async function handleImportToStudio(body: string): Promise<RouteResult> {
  const request = parseRequest<ImportPullPayload>(body);
  if (!request) {
    return { status: 400, body: createErrorResponse("unknown", "DRX_E012", "Invalid import payload") };
  }

  const payload = request.payload;
  logger.info(`Import requested: ${payload.all ? "all" : payload.requestedUuids?.length || 0} UUIDs`);

  const cacheDir = resolve(process.cwd(), ".drxporter-cache");
  const srcDir = resolve(process.cwd(), "src");
  if (payload.all) {
    reconcileWorkspace(srcDir, cacheDir, payload.cacheKey);
  }

  const store = new CacheStore(cacheDir);
  const cacheKey = payload.cacheKey || { gameId: "0", placeId: "0" };
  const cache = store.load(cacheKey);

  const instances: InstanceJson[] = [];
  const scripts: ScriptDescriptor[] = [];
  const requested = payload.all
    ? Object.keys(cache.entries).sort((a, b) => cache.entries[a].relativePath.localeCompare(cache.entries[b].relativePath))
    : payload.requestedUuids || [];

  for (const uuid of requested) {
    const entry = cache.entries[uuid];
    if (!entry) {
      logger.debug(`UUID not in cache: ${uuid}`);
      continue;
    }

    const relPath = entry.relativePath;
    if (!relPath) continue;

    if (isScriptClass(entry.className)) {
      const ext = scriptExtension(entry.className);
      const fullPath = workspaceFilePath(srcDir, relPath, ext);

      let source = entry.source || "";
      if (fullPath && existsSync(fullPath)) {
        try {
          source = readFileSync(fullPath, "utf-8");
        } catch {}
      }

      scripts.push({
        ...scriptDescriptorFromEntry(entry, source),
        parentUuid: entry.parentUuid,
      } as ScriptDescriptor);
    } else {
      const fullPath = isFolderClass(entry.className)
        ? null
        : workspaceFilePath(srcDir, relPath, INSTANCE_JSON_EXTENSION);
      const fromFile = fullPath && existsSync(fullPath) ? readInstanceJsonFile(fullPath) : null;
      instances.push({
        ...(fromFile || instanceJsonFromEntry(entry)),
        parentUuid: entry.parentUuid,
      } as InstanceJson);
    }
  }

  const orderedInstances = instances.sort((a, b) => {
    const aEntry = cache.entries[a.uuid];
    const bEntry = cache.entries[b.uuid];
    return (aEntry?.relativePath || "").localeCompare(bEntry?.relativePath || "");
  });

  logger.info(`Import response: ${orderedInstances.length} instances, ${scripts.length} scripts`);

  return {
    status: 200,
    body: createResponse(request.requestId, {
      success: true,
      instances: orderedInstances,
      scripts,
      force: payload.force === true,
    }),
  };
}
