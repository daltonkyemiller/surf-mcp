import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ToolRegistry } from "../tool-registry";
import { openTabTool } from "../tools/open-tab";
import { closeTabTool } from "../tools/close-tab";
import { getActiveTabTool } from "../tools/get-active-tab";
import { getTabsTool } from "../tools/get-tabs";
import { getTabContentTool } from "../tools/get-tab-content";
import { clickElementTool } from "../tools/click-element";
import { navigateToUrlTool } from "../tools/navigate-to-url";
import { interactElementTool } from "../tools/interact-element";
import { getPageElementsTool } from "../tools/get-page-elements";
import { injectScriptTool } from "../tools/inject-script";
import { editPageContentTool } from "../tools/edit-page-content";
import { protocolRegistry } from "@surf-mcp/shared/protocol";
import {
  openTabProtocol,
  closeTabProtocol,
  getActiveTabProtocol,
  getTabsProtocol,
  getTabContentProtocol,
  clickElementProtocol,
  navigateToUrlProtocol,
  interactElementProtocol,
  getPageElementsProtocol,
  injectScriptProtocol,
  editPageContentProtocol,
} from "@surf-mcp/shared/protocols/browser";
import { isErr } from "@surf-mcp/shared/result";

export const mcpServer = new McpServer({
  name: "surf-mcp",
  version: "1.0.0",
});

// Register browser protocols
const protocolResults = [
  protocolRegistry.register(openTabProtocol),
  protocolRegistry.register(closeTabProtocol),
  protocolRegistry.register(getActiveTabProtocol),
  protocolRegistry.register(getTabsProtocol),
  protocolRegistry.register(getTabContentProtocol),
  protocolRegistry.register(clickElementProtocol),
  protocolRegistry.register(navigateToUrlProtocol),
  protocolRegistry.register(interactElementProtocol),
  protocolRegistry.register(getPageElementsProtocol),
  protocolRegistry.register(injectScriptProtocol),
  protocolRegistry.register(editPageContentProtocol),
];

for (const result of protocolResults) {
  if (isErr(result)) {
    console.error('Failed to register protocol:', result[1].message);
    process.exit(1);
  }
}

const toolRegistry = new ToolRegistry(mcpServer);

const toolResults = [
  toolRegistry.register(openTabTool),
  toolRegistry.register(closeTabTool),
  toolRegistry.register(getActiveTabTool),
  toolRegistry.register(getTabsTool),
  toolRegistry.register(getTabContentTool),
  toolRegistry.register(clickElementTool),
  toolRegistry.register(navigateToUrlTool),
  toolRegistry.register(interactElementTool),
  toolRegistry.register(getPageElementsTool),
  toolRegistry.register(injectScriptTool),
  toolRegistry.register(editPageContentTool),
];

for (const result of toolResults) {
  if (isErr(result)) {
    console.error('Failed to register tool:', result[1].message);
    process.exit(1);
  }
}

toolRegistry.registerAllWithServer();

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await mcpServer.connect(transport);
