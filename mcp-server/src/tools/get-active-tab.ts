import z from "zod";
import { ToolRegistry } from "../tool-registry";
import { createMCPRequestSender } from "../request-handler";
import { getActiveTabProtocol } from "@surf-mcp/shared/protocols/browser";
import { isOk } from "@surf-mcp/shared/result";

export const getActiveTabTool = ToolRegistry.createToolDefinition({
  name: "get-active-tab",
  description: "Get the currently active tab information",
  schema: {},
  handler: async ({}, extra) => {
    const requestSender = createMCPRequestSender();

    const result = await requestSender.sendRequest(
      getActiveTabProtocol,
      {},
      extra,
    );

    if (isOk(result)) {
      const response = result[0];
      return {
        content: [
          {
            type: "text",
            text: `Active tab: ${response.title} (ID: ${response.tabId}, URL: ${response.url})`,
          },
        ],
      };
    } else {
      const error = result[1];
      return {
        content: [
          {
            type: "text",
            text: `Failed to get active tab: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
});