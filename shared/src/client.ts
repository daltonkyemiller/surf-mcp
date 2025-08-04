import type { ProtocolDefinition } from "./protocol";
import { RequestMessageSchema, ResponseMessageSchema } from "./protocol";
import type { RequestMessage, ResponseMessage } from "./protocol";
import type { Result } from "./result";
import { ok, err } from "./result";
import { safeJSONParse } from "./utils";
// Remove UUID import since we'll use MCP requestId

export interface ClientOptions {
  url: string;
  timeout?: number;
}

export class TypedClient {
  private socket: WebSocket | null = null;
  private pendingRequests = new Map<string, {
    resolve: (response: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private listeners = new Map<string, Array<(payload: any) => void>>();
  private options: Required<ClientOptions>;

  constructor(options: ClientOptions) {
    this.options = {
      timeout: 30000,
      ...options,
    };
  }

  async connect(): Promise<Result<void, Error>> {
    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(this.options.url);
        
        this.socket.onopen = () => {
          resolve(ok(undefined));
        };

        this.socket.onerror = (event) => {
          resolve(err(new Error(`WebSocket connection failed: ${event}`)));
        };

        this.socket.onmessage = async (event) => {
          await this.handleMessage(event.data);
        };

        this.socket.onclose = () => {
          this.cleanup();
        };

      } catch (error) {
        resolve(err(error instanceof Error ? error : new Error(String(error))));
      }
    });
  }

  private async handleMessage(data: string): Promise<void> {
    const [parsed, parseError] = safeJSONParse(data);
    if (parseError) {
      console.error("Failed to parse message:", parseError);
      return;
    }

    const responseResult = ResponseMessageSchema.safeParse(parsed);
    if (responseResult.success) {
      this.handleResponse(responseResult.data);
      return;
    }

    const requestResult = RequestMessageSchema.safeParse(parsed);
    if (requestResult.success) {
      await this.handleRequest(requestResult.data);
      return;
    }

    console.error("Received invalid message format:", parsed);
  }

  private handleResponse(response: ResponseMessage): void {
    const pending = this.pendingRequests.get(response.requestId);
    if (!pending) {
      console.error("Received response for unknown request:", response.requestId);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.requestId);

    if (response.success) {
      pending.resolve(response.payload);
    } else {
      pending.reject(new Error(response.error || "Request failed"));
    }
  }

  private async handleRequest(request: RequestMessage): Promise<void> {
    const handlers = this.listeners.get(request.type);
    if (!handlers || handlers.length === 0) {
      console.warn("No handlers registered for request type:", request.type);
      this.sendResponse(request.id, false, null, "No handler registered");
      return;
    }

    // Only process the first handler for now
    const handler = handlers[0];
    if (!handler) {
      this.sendResponse(request.id, false, null, "No handler available");
      return;
    }
    
    try {
      const result = await handler(request.payload);
      this.sendResponse(request.id, true, result);
    } catch (error) {
      console.error(`Error in handler for ${request.type}:`, error);
      this.sendResponse(request.id, false, null, error instanceof Error ? error.message : String(error));
    }
  }

  private sendResponse(requestId: string, success: boolean, payload?: any, error?: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error("Cannot send response: WebSocket is not connected");
      return;
    }

    const response = {
      id: `response_${Date.now()}`,
      kind: "response" as const,
      type: "response",
      timestamp: Date.now(),
      requestId,
      success,
      payload: payload || null,
      error,
    };

    try {
      this.socket.send(JSON.stringify(response));
    } catch (error) {
      console.error("Failed to send response:", error);
    }
  }

  async sendRequest<TRequest, TResponse>(
    protocol: ProtocolDefinition<TRequest, TResponse>,
    payload: TRequest
  ): Promise<Result<TResponse, Error>> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return err(new Error("WebSocket is not connected"));
    }

    // Validate request payload
    const validationResult = protocol.requestSchema.safeParse(payload);
    if (!validationResult.success) {
      return err(new Error(`Invalid request payload: ${validationResult.error.message}`));
    }

    const requestId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: RequestMessage = {
      id: requestId,
      kind: "request",
      type: protocol.type,
      timestamp: Date.now(),
      payload: validationResult.data,
    };

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve(err(new Error(`Request timeout after ${this.options.timeout}ms`)));
      }, this.options.timeout);

      this.pendingRequests.set(requestId, {
        resolve: (response: any) => {
          const responseValidation = protocol.responseSchema.safeParse(response);
          if (responseValidation.success) {
            resolve(ok(responseValidation.data));
          } else {
            resolve(err(new Error(`Invalid response format: ${responseValidation.error.message}`)));
          }
        },
        reject: (error: Error) => {
          resolve(err(error));
        },
        timeout,
      });

      try {
        this.socket!.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        resolve(err(error instanceof Error ? error : new Error(String(error))));
      }
    });
  }

  on<TRequest>(
    protocol: ProtocolDefinition<TRequest, any>,
    handler: (payload: TRequest) => Promise<any> | any
  ): void {
    const handlers = this.listeners.get(protocol.type) || [];
    
    // Wrap handler with validation
    const validatedHandler = async (payload: any) => {
      const validation = protocol.requestSchema.safeParse(payload);
      if (validation.success) {
        return await handler(validation.data);
      } else {
        console.error(`Invalid payload for ${protocol.type}:`, validation.error);
        throw new Error(`Invalid payload: ${validation.error.message}`);
      }
    };

    handlers.push(validatedHandler);
    this.listeners.set(protocol.type, handlers);
  }

  off<TRequest>(
    protocol: ProtocolDefinition<TRequest, any>,
    handler?: (payload: TRequest) => Promise<any> | any
  ): void {
    const handlers = this.listeners.get(protocol.type);
    if (!handlers) return;

    if (handler) {
      const index = handlers.indexOf(handler as any);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      handlers.length = 0;
    }

    if (handlers.length === 0) {
      this.listeners.delete(protocol.type);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
    }
    this.cleanup();
  }

  private cleanup(): void {
    // Clear all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();
    
    // Clear listeners
    this.listeners.clear();
    
    this.socket = null;
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}