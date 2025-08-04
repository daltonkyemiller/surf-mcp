import z from "zod";
import { ToolRegistry } from "../tool-registry";
import { createMCPRequestSender } from "../request-handler";
import { interactElementProtocol } from "@surf-mcp/shared/protocols/browser";
import { isOk } from "@surf-mcp/shared/result";

export const interactElementTool = ToolRegistry.createToolDefinition({
  name: "interact-element",
  description: "Interact with form elements, inputs, and other interactive page elements",
  schema: {
    tabId: z.number().describe("The ID of the tab to interact with"),
    selector: z.string().describe("CSS selector for the element to interact with"),
    action: z.enum(["type", "clear", "select", "focus", "blur", "scroll-into-view"]).describe("Action to perform on the element"),
    value: z.string().optional().describe("Value to type (for 'type' action) or option to select (for 'select' action)"),
  },
  handler: async ({ tabId, selector, action, value }, extra) => {
    const requestSender = createMCPRequestSender();

    const result = await requestSender.sendRequest(
      interactElementProtocol,
      { tabId, selector, action, value },
      extra,
    );

    if (isOk(result)) {
      const response = result[0];
      let message = response.success 
        ? `Successfully performed "${action}" action on element "${selector}" in tab ${tabId}`
        : `Failed to perform "${action}" action on element "${selector}" in tab ${tabId}`;
      
      if (response.elementValue) {
        message += ` (element value: "${response.elementValue}")`;
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
            text: `Failed to interact with element: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
});