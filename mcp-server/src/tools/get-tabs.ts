import z from "zod";
import { ToolRegistry } from "../tool-registry";
import { createMCPRequestSender } from "../request-handler";
import { getTabsProtocol } from "@surf-mcp/shared/protocols/browser";
import { isOk } from "@surf-mcp/shared/result";

export const getTabsTool = ToolRegistry.createToolDefinition({
  name: "get-tabs",
  description: "Get the list of all open tabs",
  schema: {},
  handler: async ({}, extra) => {
    const requestSender = createMCPRequestSender();

    const result = await requestSender.sendRequest(
      getTabsProtocol,
      {},
      extra,
    );

    if (isOk(result)) {
      const response = result[0];
      const tabsList = response.tabs
        .map(tab => `${tab.active ? "* " : "  "}${tab.title} (ID: ${tab.tabId}, URL: ${tab.url})`)
        .join("\n");
      
      return {
        content: [
          {
            type: "text",
            text: `Open tabs:\n${tabsList}`,
          },
        ],
      };
    } else {
      const error = result[1];
      return {
        content: [
          {
            type: "text",
            text: `Failed to get tabs: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
});