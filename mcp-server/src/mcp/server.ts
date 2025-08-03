import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ToolRegistry } from "../tool-registry";
import { openTabTool } from "../tools/open-tab";

export const mcpServer = new McpServer({
  name: "surf-mcp",
  version: "1.0.0",
});

const toolRegistry = new ToolRegistry(mcpServer);

toolRegistry.register(openTabTool);

toolRegistry.registerAllWithServer();

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await mcpServer.connect(transport);
