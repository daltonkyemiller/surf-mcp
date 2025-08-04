import z from "zod";
import { ToolRegistry } from "../tool-registry";
import { createMCPRequestSender } from "../request-handler";
import { closeTabProtocol } from "@surf-mcp/shared/protocols/browser";
import { isOk } from "@surf-mcp/shared/result";

export const closeTabTool = ToolRegistry.createToolDefinition({
  name: "close-tab",
  description: "Close a tab in the browser",
  schema: { tabId: z.number() },
  handler: async ({ tabId }, extra) => {
    const requestSender = createMCPRequestSender();

    const result = await requestSender.sendRequest(
      closeTabProtocol,
      { tabId },
      extra,
    );

    if (isOk(result)) {
      const response = result[0];
      return {
        content: [
          {
            type: "text",
            text: response.success 
              ? `Successfully closed tab with ID ${tabId}`
              : `Failed to close tab with ID ${tabId}`,
          },
        ],
      };
    } else {
      const error = result[1];
      return {
        content: [
          {
            type: "text",
            text: `Failed to close tab: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
});