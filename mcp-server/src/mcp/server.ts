import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ToolRegistry } from "../tool-registry";
import { openTabTool } from "../tools/open-tab";
import { closeTabTool } from "../tools/close-tab";
import { getActiveTabTool } from "../tools/get-active-tab";
import { getTabsTool } from "../tools/get-tabs";
import { getTabContentTool } from "../tools/get-tab-content";
import { protocolRegistry } from "@surf-mcp/shared/protocol";
import {
  openTabProtocol,
  closeTabProtocol,
  getActiveTabProtocol,
  getTabsProtocol,
  getTabContentProtocol,
} from "@surf-mcp/shared/protocols/browser";

export const mcpServer = new McpServer({
  name: "surf-mcp",
  version: "1.0.0",
});

// Register browser protocols
protocolRegistry.register(openTabProtocol);
protocolRegistry.register(closeTabProtocol);
protocolRegistry.register(getActiveTabProtocol);
protocolRegistry.register(getTabsProtocol);
protocolRegistry.register(getTabContentProtocol);

const toolRegistry = new ToolRegistry(mcpServer);

toolRegistry.register(openTabTool);
toolRegistry.register(closeTabTool);
toolRegistry.register(getActiveTabTool);
toolRegistry.register(getTabsTool);
toolRegistry.register(getTabContentTool);

toolRegistry.registerAllWithServer();

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await mcpServer.connect(transport);
