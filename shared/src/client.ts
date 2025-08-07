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
  autoReconnect?: boolean;
  maxReconnectInterval?: number;
  heartbeatInterval?: number;
}

export interface ReconnectionOptions {
  maxInterval: number;
  initialInterval: number;
  jitterMs: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface ConnectionMetrics {
  totalConnections: number;
  totalReconnections: number;
  totalFailures: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  averageReconnectTime: number;
}

export class TypedClient {
  private socket: WebSocket | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (response: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private listeners = new Map<string, Array<(payload: any) => void>>();
  private options: Required<ClientOptions>;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectionOptions: ReconnectionOptions;
  private currentReconnectInterval = 1000;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  private lastPongReceived = 0;
  private reconnectAttempts = 0;
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    totalReconnections: 0,
    totalFailures: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    averageReconnectTime: 0
  };
  private reconnectStartTime = 0;
  private debugMode = false;

  constructor(options: ClientOptions) {
    this.options = {
      timeout: 30000,
      autoReconnect: true,
      maxReconnectInterval: 5000,
      heartbeatInterval: 15000,
      ...options,
    };
    this.reconnectionOptions = {
      maxInterval: this.options.maxReconnectInterval,
      initialInterval: 1000,
      jitterMs: 200,
    };
  }

  async connect(): Promise<Result<void, Error>> {
    if (this.connectionState === 'connecting') {
      return err(new Error('Already connecting'));
    }

    this.connectionState = 'connecting';
    this.clearReconnectTimeout();

    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(this.options.url);

        this.socket.onopen = () => {
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.currentReconnectInterval = this.reconnectionOptions.initialInterval;
          this.startHeartbeat();
          resolve(ok(undefined));
        };

        this.socket.onerror = (event) => {
          this.connectionState = 'failed';
          resolve(err(new Error(`WebSocket connection failed: ${event}`)));
        };

        this.socket.onmessage = async (event) => {
          if (event.data === 'pong') {
            this.lastPongReceived = Date.now();
            return;
          }
          await this.handleMessage(event.data);
        };

        this.socket.onclose = (event) => {
          this.handleDisconnection(event.wasClean);
        };
      } catch (error) {
        this.connectionState = 'failed';
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
      console.error(
        "Received response for unknown request:",
        response.requestId,
      );
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
      this.sendResponse(
        request.id,
        false,
        null,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private sendResponse(
    requestId: string,
    success: boolean,
    payload?: any,
    error?: string,
  ): void {
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
    payload: TRequest,
  ): Promise<Result<TResponse, Error>> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return err(new Error("WebSocket is not connected"));
    }

    // Validate request payload
    const validationResult = protocol.requestSchema.safeParse(payload);
    if (!validationResult.success) {
      return err(
        new Error(`Invalid request payload: ${validationResult.error.message}`),
      );
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
        resolve(
          err(new Error(`Request timeout after ${this.options.timeout}ms`)),
        );
      }, this.options.timeout);

      this.pendingRequests.set(requestId, {
        resolve: (response: any) => {
          const responseValidation =
            protocol.responseSchema.safeParse(response);
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
    handler: (payload: TRequest) => Promise<any> | any,
  ): void {
    const handlers = this.listeners.get(protocol.type) || [];

    // Wrap handler with validation
    const validatedHandler = async (payload: any) => {
      const validation = protocol.requestSchema.safeParse(payload);
      if (validation.success) {
        return await handler(validation.data);
      } else {
        console.error(
          `Invalid payload for ${protocol.type}:`,
          validation.error,
        );
        throw new Error(`Invalid payload: ${validation.error.message}`);
      }
    };

    handlers.push(validatedHandler);
    this.listeners.set(protocol.type, handlers);
  }

  off<TRequest>(
    protocol: ProtocolDefinition<TRequest, any>,
    handler?: (payload: TRequest) => Promise<any> | any,
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

  private handleDisconnection(wasClean: boolean): void {
    this.stopHeartbeat();
    this.connectionState = 'disconnected';
    
    // Clear all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();

    if (this.options.autoReconnect && !wasClean) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.connectionState === 'reconnecting') {
      return;
    }

    this.connectionState = 'reconnecting';

    // Calculate next reconnect interval with gentle linear backoff
    const baseInterval = Math.min(
      this.reconnectionOptions.initialInterval + (this.reconnectAttempts - 1) * 1000,
      this.reconnectionOptions.maxInterval
    );
    
    // Add jitter to avoid thundering herd
    const jitter = (Math.random() - 0.5) * 2 * this.reconnectionOptions.jitterMs;
    this.currentReconnectInterval = Math.max(500, baseInterval + jitter);

    this.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${this.currentReconnectInterval}ms`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.attemptReconnect();
    }, this.currentReconnectInterval);
  }

  private async attemptReconnect(): Promise<void> {
    if (this.connectionState !== 'reconnecting') {
      return;
    }

    this.reconnectAttempts++;
    this.log(`Attempting reconnect ${this.reconnectAttempts}...`);
    const result = await this.connect();
    
    if (result[1]) {
      this.log(`Reconnect attempt ${this.reconnectAttempts} failed: ${result[1].message}`, undefined, 'error');
      this.scheduleReconnect();
    } else {
      this.log(`Reconnected successfully after ${this.reconnectAttempts} attempts`);
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastPongReceived = Date.now();
    
    this.heartbeatIntervalId = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        // Check if we missed pongs
        const now = Date.now();
        if (now - this.lastPongReceived > this.options.heartbeatInterval * 2) {
          this.log('Heartbeat timeout, closing connection', { 
            timeSinceLastPong: now - this.lastPongReceived,
            threshold: this.options.heartbeatInterval * 2
          }, 'warn');
          this.socket.close();
          return;
        }
        
        // Send ping
        this.socket.send('ping');
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  disconnect(): void {
    this.clearReconnectTimeout();
    this.stopHeartbeat();
    this.connectionState = 'disconnected';
    
    if (this.socket) {
      this.socket.close();
    }
    this.cleanup();
  }

  private cleanup(): void {
    // Clear all pending requests (if not already cleared)
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();
    this.socket = null;
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  setAutoReconnect(enabled: boolean): void {
    this.options.autoReconnect = enabled;
    if (!enabled) {
      this.clearReconnectTimeout();
    }
  }

  setReconnectionOptions(options: Partial<ReconnectionOptions>): void {
    this.reconnectionOptions = { ...this.reconnectionOptions, ...options };
    this.log('Reconnection options updated', options);
  }

  updateUrl(newUrl: string): void {
    this.options.url = newUrl;
    this.log('URL updated', { newUrl });
  }
  
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.log('Debug mode', { enabled });
  }
  
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }
  
  resetMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      totalReconnections: 0,
      totalFailures: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      averageReconnectTime: 0
    };
    this.log('Metrics reset');
  }
  
  private log(message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info'): void {
    // Only log reconnection-related messages in debug mode
    if (!this.debugMode && (message.includes('reconnect') || message.includes('Reconnected'))) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      connectionState: this.connectionState,
      url: this.options.url,
      reconnectAttempts: this.reconnectAttempts,
      ...(data || {})
    };
    
    const logMessage = `[WebSocket] ${message}`;
    
    if (level === 'error') {
      console.error(logMessage, this.debugMode ? logData : '');
    } else if (level === 'warn') {
      console.warn(logMessage, this.debugMode ? logData : '');
    } else {
      console.log(logMessage, this.debugMode ? logData : '');
    }
  }
}

