import { handleHealth } from "./handlers/ping";
import { handleConnect } from "./handlers/connect";
import { handleExportFromStudio } from "./handlers/export-from-studio";
import { handleImportToStudio } from "./handlers/import-to-studio";
import { handleValidate } from "./handlers/validate";
import { handleDiagnostics } from "./handlers/diagnostics";
import { handleSyncChanges } from "./handlers/sync-changes";
import { handleSyncPushFromStudio } from "./handlers/sync-push-from-studio";
import { handleSyncInitial } from "./handlers/sync-initial";
import { createLogger } from "../logging/logger";

const logger = createLogger("router");

export interface RouteResult {
  status: number;
  body: unknown;
}

type RouteHandler = (body: string, startTime: number) => Promise<RouteResult>;

interface Router {
  handle(method: string, url: string, body: string, startTime: number): Promise<RouteResult>;
}

export function createRouter(): Router {
  const routes: Record<string, Record<string, RouteHandler>> = {
    GET: {
      "/health": handleHealth,
      "/sync/changes": handleSyncChanges,
    },
    POST: {
      "/connect": handleConnect,
      "/export/push": handleExportFromStudio,
      "/import/pull": handleImportToStudio,
      "/validate": handleValidate,
      "/diagnostics": handleDiagnostics,
      "/sync/push-from-studio": handleSyncPushFromStudio,
      "/sync/initial": handleSyncInitial,
    },
  };

  return {
    async handle(method: string, url: string, body: string, startTime: number): Promise<RouteResult> {
      const methodRoutes = routes[method];
      if (!methodRoutes) {
        return { status: 405, body: { error: "Method not allowed" } };
      }

      const handler = methodRoutes[url];
      if (!handler) {
        return { status: 404, body: { error: "Not found" } };
      }

      return handler(body, startTime);
    },
  };
}
