import type { RouteResult } from "../router";
import { createResponse } from "../protocol";

export async function handleDiagnostics(_body: string): Promise<RouteResult> {
  return {
    status: 200,
    body: createResponse("diagnostics", {
      diagnostics: [],
      timestamp: Date.now(),
    }),
  };
}
