import type { RouteResult } from "../router";
import { createResponse } from "../protocol";
import { getPendingChanges } from "../watcher";
import { createLogger } from "../../logging/logger";

const logger = createLogger("sync");

export async function handleSyncChanges(_body: string): Promise<RouteResult> {
  const changes = getPendingChanges();

  if (changes.length > 0) {
    logger.info(`Sending ${changes.length} pending changes to Studio`);
  }

  return {
    status: 200,
    body: createResponse("sync", { changes }),
  };
}
