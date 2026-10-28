import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createRouter } from "./router";
import { createLogger } from "../logging/logger";
import { stopWatcher } from "./watcher";

const logger = createLogger("server");

const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50MB

export interface ServerOptions {
  port: number;
  host: string;
}

export interface BridgeServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createServer(options: ServerOptions): BridgeServer {
  const router = createRouter();
  const startTime = Date.now();

  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || "/";
    const method = req.method || "GET";

    logger.debug(`${method} ${url}`);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      let body = "";
      let bodySize = 0;
      for await (const chunk of req) {
        bodySize += chunk.length;
        if (bodySize > MAX_BODY_SIZE) {
          res.writeHead(413);
          res.end(JSON.stringify({ error: "Request body too large" }));
          return;
        }
        body += chunk;
      }

      const result = await router.handle(method, url, body, startTime);
      res.writeHead(result.status);
      res.end(JSON.stringify(result.body));
    } catch (err) {
      logger.error(`Request error: ${err instanceof Error ? err.message : String(err)}`);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });

  return {
    async start() {
      return new Promise<void>((resolve, reject) => {
        const handleError = (err: Error) => {
          httpServer.off("listening", handleListening);
          reject(err);
        };

        const handleListening = () => {
          httpServer.off("error", handleError);
          logger.info(`Bridge server listening on ${options.host}:${options.port}`);
          logger.info("Waiting for Studio to connect and export...");
          resolve();
        };

        httpServer.once("error", handleError);
        httpServer.once("listening", handleListening);
        httpServer.listen(options.port, options.host);
      });
    },
    async stop() {
      return new Promise<void>((resolve, reject) => {
        stopWatcher();
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
        httpServer.closeAllConnections();
      });
    },
  };
}
