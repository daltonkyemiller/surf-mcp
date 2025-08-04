import z from "zod";

// Base message structure for WebSocket communication
export const BaseMessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.number(),
});

export const RequestMessageSchema = BaseMessageSchema.extend({
  kind: z.literal("request"),
  payload: z.unknown(),
});

export const ResponseMessageSchema = BaseMessageSchema.extend({
  kind: z.literal("response"),
  requestId: z.string(),
  success: z.boolean(),
  payload: z.unknown(),
  error: z.string().optional(),
});

export type BaseMessage = z.infer<typeof BaseMessageSchema>;
export type RequestMessage = z.infer<typeof RequestMessageSchema>;
export type ResponseMessage = z.infer<typeof ResponseMessageSchema>;

// Protocol definition system
export interface ProtocolDefinition<TRequest = unknown, TResponse = unknown> {
  type: string;
  requestSchema: z.ZodSchema<TRequest>;
  responseSchema: z.ZodSchema<TResponse>;
}

// Registry for all protocol definitions
export class ProtocolRegistry {
  private protocols = new Map<string, ProtocolDefinition<any, any>>();

  register<TRequest, TResponse>(
    protocol: ProtocolDefinition<TRequest, TResponse>
  ): void {
    if (this.protocols.has(protocol.type)) {
      throw new Error(`Protocol type '${protocol.type}' is already registered`);
    }
    this.protocols.set(protocol.type, protocol);
  }

  get<TRequest, TResponse>(
    type: string
  ): ProtocolDefinition<TRequest, TResponse> | undefined {
    return this.protocols.get(type) as ProtocolDefinition<TRequest, TResponse>;
  }

  has(type: string): boolean {
    return this.protocols.has(type);
  }

  getAllTypes(): string[] {
    return Array.from(this.protocols.keys());
  }
}

// Helper to create protocol definitions with type safety
export function defineProtocol<TRequest, TResponse>(
  type: string,
  requestSchema: z.ZodSchema<TRequest>,
  responseSchema: z.ZodSchema<TResponse>
): ProtocolDefinition<TRequest, TResponse> {
  return {
    type,
    requestSchema,
    responseSchema,
  };
}

// Global protocol registry instance
export const protocolRegistry = new ProtocolRegistry();

