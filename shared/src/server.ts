import type { ProtocolDefinition } from "./protocol";
import { RequestMessageSchema, ResponseMessageSchema } from "./protocol";
import type { RequestMessage, ResponseMessage } from "./protocol";
import type { Result } from "./result";
import { ok, err } from "./result";
import { safeJSONParse } from "./utils";

export interface ServerOptions {
  port?: number;
}

export class TypedServer {
  private server: any;
  private connections = new Set<any>();
  private handlers = new Map<string, (payload: any, requestId: string) => Promise<any>>();

  constructor(private options: ServerOptions = {}) {}

  start(): void {
    this.server = Bun.serve({
      port: this.options.port || 3000,
      fetch: (req, server) => {
        if (server.upgrade(req)) {
          return;
        }
        return new Response("TypedServer WebSocket endpoint");
      },
      websocket: {
        open: (ws) => {
          this.connections.add(ws);
        },
        message: (ws, msg) => {
          this.handleMessage(ws, msg);
        },
        close: (ws) => {
          this.connections.delete(ws);
        },
      },
    });
  }

  stop(): void {
    if (this.server) {
      this.server.stop();
      this.connections.clear();
    }
  }

  private async handleMessage(ws: any, data: string | Buffer): Promise<void> {
    // Handle heartbeat messages
    if (data === 'ping') {
      try {
        ws.send('pong');
      } catch (error) {
        console.error('Failed to send pong:', error);
      }
      return;
    }

    const [parsed, parseError] = safeJSONParse(data);
    if (parseError) {
      console.error("Failed to parse message:", parseError);
      return;
    }

    const requestResult = RequestMessageSchema.safeParse(parsed);
    if (!requestResult.success) {
      console.error("Invalid request format:", requestResult.error);
      return;
    }

    const request = requestResult.data;
    const handler = this.handlers.get(request.type);
    
    if (!handler) {
      this.sendResponse(ws, {
        id: `response_${Date.now()}`,
        kind: "response",
        type: request.type,
        timestamp: Date.now(),
        requestId: request.id,
        success: false,
        payload: null,
        error: `No handler registered for type: ${request.type}`,
      });
      return;
    }

    try {
      const result = await handler(request.payload, request.id);
      this.sendResponse(ws, {
        id: `response_${Date.now()}`,
        kind: "response",
        type: request.type,
        timestamp: Date.now(),
        requestId: request.id,
        success: true,
        payload: result,
      });
    } catch (error) {
      this.sendResponse(ws, {
        id: `response_${Date.now()}`,
        kind: "response",
        type: request.type,
        timestamp: Date.now(),
        requestId: request.id,
        success: false,
        payload: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private sendResponse(ws: any, response: ResponseMessage): void {
    try {
      ws.send(JSON.stringify(response));
    } catch (error) {
      console.error("Failed to send response:", error);
    }
  }

  handle<TRequest, TResponse>(
    protocol: ProtocolDefinition<TRequest, TResponse>,
    handler: (payload: TRequest, requestId: string) => Promise<TResponse>
  ): Result<void, Error> {
    if (this.handlers.has(protocol.type)) {
      return err(new Error(`Handler for type '${protocol.type}' is already registered`));
    }

    this.handlers.set(protocol.type, async (payload: any, requestId: string) => {
      // Validate request payload
      const validation = protocol.requestSchema.safeParse(payload);
      if (!validation.success) {
        throw new Error(`Invalid request payload: ${validation.error.message}`);
      }

      const result = await handler(validation.data, requestId);

      // Validate response payload
      const responseValidation = protocol.responseSchema.safeParse(result);
      if (!responseValidation.success) {
        throw new Error(`Invalid response payload: ${responseValidation.error.message}`);
      }

      return responseValidation.data;
    });
    return ok(undefined);
  }

  // Method to broadcast to all connections (useful for notifications)
  broadcast<TRequest>(
    protocol: ProtocolDefinition<TRequest, any>,
    payload: TRequest
  ): void {
    const validation = protocol.requestSchema.safeParse(payload);
    if (!validation.success) {
      console.error(`Invalid broadcast payload: ${validation.error.message}`);
      return;
    }

    const message: RequestMessage = {
      id: `broadcast_${Date.now()}`,
      kind: "request",
      type: protocol.type,
      timestamp: Date.now(),
      payload: validation.data,
    };

    const messageStr = JSON.stringify(message);
    for (const ws of this.connections) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error("Failed to broadcast to connection:", error);
      }
    }
  }
}