import type { ProtocolDefinition } from "@surf-mcp/shared/protocol";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { type Result, ok, err } from "@surf-mcp/shared/result";
import { wsServer } from "./ws/server";

export class RequestHandler {
  private static instance: RequestHandler;

  private constructor() {}

  static getInstance(): RequestHandler {
    if (!RequestHandler.instance) {
      RequestHandler.instance = new RequestHandler();
    }
    return RequestHandler.instance;
  }

  async sendRequest<TRequest, TResponse>(
    protocol: ProtocolDefinition<TRequest, TResponse>,
    payload: TRequest,
    requestId: string,
  ): Promise<Result<TResponse, Error>> {
    // Validate the request payload
    const validation = protocol.requestSchema.safeParse(payload);
    if (!validation.success) {
      return err(
        new Error(`Invalid request payload: ${validation.error.message}`),
      );
    }

    // Create the WebSocket message
    const message = {
      id: requestId,
      kind: "request" as const,
      type: protocol.type,
      timestamp: Date.now(),
      payload: validation.data,
    };

    return new Promise((resolve) => {
      // Set up response timeout
      const timeout = setTimeout(() => {
        resolve(err(new Error(`Request timeout for ${protocol.type}`)));
      }, 30000);

      // Set up one-time response handler
      const responseHandler = (responsePayload: any) => {
        clearTimeout(timeout);

        // Validate response payload
        const responseValidation =
          protocol.responseSchema.safeParse(responsePayload);
        if (responseValidation.success) {
          resolve(ok(responseValidation.data));
        } else {
          resolve(
            err(
              new Error(
                `Invalid response format: ${responseValidation.error.message}`,
              ),
            ),
          );
        }
      };

      // Register temporary response handler with the WebSocket server
      wsServer.setResponseHandler(requestId, responseHandler);

      // Send the message through WebSocket server
      const success = wsServer.broadcast(JSON.stringify(message));
      if (!success) {
        clearTimeout(timeout);
        wsServer.removeResponseHandler(requestId);
        resolve(
          err(new Error("Failed to send request - no active connections")),
        );
      }
    });
  }
}

// Helper function for MCP tools
export function createMCPRequestSender() {
  const handler = RequestHandler.getInstance();

  return {
    async sendRequest<TRequest, TResponse>(
      protocol: ProtocolDefinition<TRequest, TResponse>,
      payload: TRequest,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ): Promise<Result<TResponse, Error>> {
      const requestId = extra.requestId.toString();
      return handler.sendRequest(protocol, payload, requestId);
    },
  };
}
