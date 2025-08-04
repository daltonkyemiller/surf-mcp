import z from "zod";
import { ToolRegistry } from "../tool-registry";
import { createMCPRequestSender } from "../request-handler";
import { clickElementProtocol } from "@surf-mcp/shared/protocols/browser";
import { isOk } from "@surf-mcp/shared/result";

export const clickElementTool = ToolRegistry.createToolDefinition({
  name: "click-element",
  description: "Click an element on the page using a CSS selector",
  schema: {
    tabId: z.number().describe("The ID of the tab to interact with"),
    selector: z.string().describe("CSS selector for the element to click (e.g., 'button', '#submit-btn', '.nav-link')"),
    waitForNavigation: z.boolean().optional().describe("Whether to wait for navigation after click (default: false)"),
  },
  handler: async ({ tabId, selector, waitForNavigation }, extra) => {
    const requestSender = createMCPRequestSender();

    const result = await requestSender.sendRequest(
      clickElementProtocol,
      { tabId, selector, waitForNavigation },
      extra,
    );

    if (isOk(result)) {
      const response = result[0];
      let message = response.success 
        ? `Successfully clicked element "${selector}" on tab ${tabId}`
        : `Failed to click element "${selector}" on tab ${tabId}`;
      
      if (response.navigated) {
        message += " (page navigation occurred)";
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
            text: `Failed to click element: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
});