import { ResponseMessageSchema } from "@surf-mcp/shared/protocol";
import { safeJSONParse } from "@surf-mcp/shared/utils";
import log from "../logger";

export class WSServer {
  private server: any;
  private connections = new Set<any>();
  private responseHandlers = new Map<string, (payload: any) => void>();

  constructor() {}

  start(port: number = 3000): void {
    this.server = Bun.serve({
      port,
      fetch: (req, server) => {
        if (server.upgrade(req)) {
          return;
        }
        return new Response("Surf MCP WebSocket Server");
      },
      websocket: {
        open: (ws) => {
          this.connections.add(ws);
          log.info(
            `WebSocket connection established. Total connections: ${this.connections.size}`,
          );
        },
        message: (ws, msg) => {
          this.handleMessage(ws, msg);
        },
        close: (ws) => {
          this.connections.delete(ws);
          log.info(
            `WebSocket connection closed. Total connections: ${this.connections.size}`,
          );
        },
      },
    });

    log.info(`WebSocket server started on port ${port}`);
  }

  stop(): void {
    if (this.server) {
      this.server.stop();
      this.connections.clear();
      this.responseHandlers.clear();
      log.info("WebSocket server stopped");
    }
  }

  private handleMessage(ws: any, data: string | Buffer): void {
    const [parsed, parseError] = safeJSONParse(data);
    if (parseError) {
      log.error("Failed to parse WebSocket message:", parseError);
      return;
    }

    // Check if this is a response message
    const responseResult = ResponseMessageSchema.safeParse(parsed);
    if (responseResult.success) {
      this.handleResponse(responseResult.data);
      return;
    }

    log.debug("Received WebSocket message:", parsed);
  }

  private handleResponse(response: any): void {
    const handler = this.responseHandlers.get(response.requestId);
    if (!handler) {
      log.warn(
        `No handler found for response with requestId: ${response.requestId}`,
      );
      return;
    }

    // Remove the handler after use
    this.responseHandlers.delete(response.requestId);

    // Call the handler with the response payload
    if (response.success) {
      handler(response.payload);
    } else {
      handler(new Error(response.error || "Request failed"));
    }
  }

  setResponseHandler(requestId: string, handler: (payload: any) => void): void {
    this.responseHandlers.set(requestId, handler);
  }

  removeResponseHandler(requestId: string): void {
    this.responseHandlers.delete(requestId);
  }

  broadcast(message: string): boolean {
    if (this.connections.size === 0) {
      log.warn("No active WebSocket connections to broadcast to");
      return false;
    }

    let successCount = 0;
    for (const ws of this.connections) {
      try {
        ws.send(message);
        successCount++;
      } catch (error) {
        log.error("Failed to send message to WebSocket connection:", error);
        this.connections.delete(ws);
      }
    }

    log.debug(
      `Broadcasted message to ${successCount}/${this.connections.size} connections`,
    );
    return successCount > 0;
  }

  get connectionCount(): number {
    return this.connections.size;
  }
}

export const wsServer = new WSServer();
