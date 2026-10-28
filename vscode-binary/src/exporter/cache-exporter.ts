import type { PlaceCache, CacheEntry, InstanceJson, ScriptDescriptor } from "@drxporter/shared";
import { isScriptClass, isFolderClass, SCRIPT_EXTENSIONS, INSTANCE_JSON_EXTENSION } from "@drxporter/shared";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createLogger } from "../logging/logger";

const logger = createLogger("cache-exporter");

export function exportFromCache(cache: PlaceCache, outputRoot: string): number {
  const entries = cache.entries;
  const uuids = Object.keys(entries);

  if (uuids.length === 0) {
    logger.warn("No entries in cache to export");
    return 0;
  }

  let count = 0;
  const srcDir = resolve(outputRoot, "src");

  for (const uuid of uuids) {
    const entry = entries[uuid];
    if (!entry.relativePath) {
      logger.warn(`Skipping ${entry.name} (${uuid}): no relativePath`);
      continue;
    }

    const relPath = entry.relativePath;

    if (isScriptClass(entry.className)) {
      const ext = SCRIPT_EXTENSIONS[entry.className] || ".lua";
      const fullPath = resolve(srcDir, relPath + ext);
      const dir = dirname(fullPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      const source = (entry as any).source || "";
      writeFileSync(fullPath, source, "utf-8");
      logger.info(`Wrote script: ${relPath}${ext}`);
      count++;
    } else if (isFolderClass(entry.className)) {
      const dirPath = resolve(srcDir, relPath);
      const legacyPath = resolve(srcDir, relPath + INSTANCE_JSON_EXTENSION);
      if (existsSync(legacyPath)) unlinkSync(legacyPath);
      if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
      logger.info(`Wrote folder: ${relPath}/`);
      count++;
    } else {
      const fullPath = resolve(srcDir, relPath + INSTANCE_JSON_EXTENSION);
      const dir = dirname(fullPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      const instanceJson: InstanceJson = {
        uuid: entry.uuid,
        className: entry.className,
        name: entry.name,
        properties: (entry as any).properties || {},
        attributes: (entry as any).attributes || {},
        tags: (entry as any).tags || [],
        children: (entry as any).children || [],
      };

      writeFileSync(fullPath, JSON.stringify(instanceJson, null, 2), "utf-8");
      logger.info(`Wrote instance: ${relPath}${INSTANCE_JSON_EXTENSION}`);
      count++;
    }
  }

  return count;
}
