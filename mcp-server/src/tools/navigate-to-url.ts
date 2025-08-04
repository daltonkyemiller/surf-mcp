import z from "zod";
import { ToolRegistry } from "../tool-registry";
import { createMCPRequestSender } from "../request-handler";
import { navigateToUrlProtocol } from "@surf-mcp/shared/protocols/browser";
import { isOk } from "@surf-mcp/shared/result";

export const navigateToUrlTool = ToolRegistry.createToolDefinition({
  name: "navigate-to-url",
  description: "Navigate a tab to a specific URL",
  schema: {
    tabId: z.number().describe("The ID of the tab to navigate"),
    url: z.string().url().describe("The URL to navigate to"),
    waitForLoad: z.boolean().optional().describe("Whether to wait for page load completion (default: true)"),
  },
  handler: async ({ tabId, url, waitForLoad }, extra) => {
    const requestSender = createMCPRequestSender();

    const result = await requestSender.sendRequest(
      navigateToUrlProtocol,
      { tabId, url, waitForLoad },
      extra,
    );

    if (isOk(result)) {
      const response = result[0];
      let message = response.success 
        ? `Successfully navigated tab ${tabId} to ${url}`
        : `Failed to navigate tab ${tabId} to ${url}`;
      
      if (response.finalUrl && response.finalUrl !== url) {
        message += ` (redirected to ${response.finalUrl})`;
      }
      
      if (response.message) {
        message += `: ${response.message}`;
      }

      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
      };
    } else {
      const error = result[1];
      return {
        content: [
          {
            type: "text",
            text: `Failed to navigate: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
});