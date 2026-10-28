import type { RouteResult } from "../router";
import { BINARY_VERSION } from "@drxporter/shared";

export async function handleHealth(_body: string, startTime: number): Promise<RouteResult> {
  return {
    status: 200,
    body: {
      status: "ok",
      version: BINARY_VERSION,
      uptime: Date.now() - startTime,
    },
  };
}
