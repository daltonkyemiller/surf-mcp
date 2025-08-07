import type {
  RegisteredTool,
  McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import z from "zod";
import type { Result } from "@surf-mcp/shared/result";
import { ok, err } from "@surf-mcp/shared/result";

export type ToolDefinition<TSchema extends z.ZodRawShape = z.ZodRawShape> = {
  name: string;
  description: string;
  schema: TSchema;
  handler: (
    args: z.objectOutputType<TSchema, z.ZodTypeAny>,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ) => Promise<CallToolResult>;
};

export class ToolRegistry {
  private toolDefinitions = new Map<string, ToolDefinition<any>>();
  private tools = new Map<string, RegisteredTool>();
  private server: McpServer;

  constructor(server: McpServer) {
    this.server = server;
  }

  register<TSchema extends z.ZodRawShape>(input: ToolDefinition<TSchema>): Result<void, Error> {
    if (this.toolDefinitions.has(input.name)) {
      return err(new Error(`Tool with name ${input.name} already exists`));
    }
    this.toolDefinitions.set(input.name, input);
    return ok(undefined);
  }

  registerAllWithServer() {
    for (const [name, definition] of this.toolDefinitions) {
      const tool = this.server.tool(
        name,
        definition.description,
        definition.schema,
        async (args, extra) => {
          const result = await definition.handler(args, extra);
          return result;
        },
      );

      this.tools.set(name, tool);
    }
  }

  static createToolDefinition<TSchema extends z.ZodRawShape>(
    toolDefinition: ToolDefinition<TSchema>,
  ): ToolDefinition<TSchema> {
    return toolDefinition;
  }
}
