import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { wsServer } from "./ws";

export const mcpServer = new McpServer({
  name: "surf-mcp",
  version: "1.0.0",
});

// Add an addition tool
mcpServer.tool(
  "open-tab",
  "Open a new tab",
  { url: z.string() },
  async ({ url }) => {
    wsServer.publish(
      "open-tab",
      JSON.stringify({ type: "open-tab", data: { url } }),
    );

    return { content: [{ type: "text", text: `Opening ${url}` }] };
  },
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await mcpServer.connect(transport);
