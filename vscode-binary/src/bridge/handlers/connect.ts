import type { RouteResult } from "../router";
import { parseRequest, createResponse, createErrorResponse } from "../protocol";
import type { ConnectPayload } from "@drxporter/shared";
import { createLogger } from "../../logging/logger";

const logger = createLogger("connect");

export async function handleConnect(body: string): Promise<RouteResult> {
  const request = parseRequest<ConnectPayload>(body);
  if (!request) {
    return { status: 400, body: createErrorResponse("unknown", "DRX_E012", "Invalid request payload") };
  }

  const payload = request.payload;
  if (!payload.gameId || !payload.placeId) {
    return { status: 400, body: createErrorResponse(request.requestId, "DRX_E012", "Missing gameId or placeId") };
  }

  logger.info(`Plugin connected: game=${payload.gameId} place=${payload.placeId} version=${payload.pluginVersion}`);

  return {
    status: 200,
    body: createResponse(request.requestId, { connected: true }),
  };
}
