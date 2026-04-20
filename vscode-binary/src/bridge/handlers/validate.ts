import type { RouteResult } from "../router";
import { parseRequest, createResponse, createErrorResponse } from "../protocol";
import type { ValidatePayload } from "@drxporter/shared";
import { createLogger } from "../../logging/logger";

const logger = createLogger("validate");

export async function handleValidate(body: string): Promise<RouteResult> {
  const request = parseRequest<ValidatePayload>(body);
  if (!request) {
    return { status: 400, body: createErrorResponse("unknown", "DRX_E012", "Invalid validate payload") };
  }

  logger.info(`Validation requested for game=${request.payload.cacheKey?.gameId}`);

  return {
    status: 200,
    body: createResponse(request.requestId, {
      valid: true,
      errors: [],
    }),
  };
}
