import z from "zod";
import { ToolRegistry } from "../tool-registry";
import { createMCPRequestSender } from "../request-handler";
import { getPageElementsProtocol } from "@surf-mcp/shared/protocols/browser";
import { isOk } from "@surf-mcp/shared/result";

export const getPageElementsTool = ToolRegistry.createToolDefinition({
  name: "get-page-elements",
  description: "Get interactive elements from a page that can be clicked or interacted with",
  schema: {
    tabId: z.number().describe("The ID of the tab to get elements from"),
    selector: z.string().optional().describe("CSS selector to filter elements (default: clickable elements like buttons, links, inputs)"),
    includeHidden: z.boolean().optional().describe("Whether to include hidden elements (default: false)"),
  },
  handler: async ({ tabId, selector, includeHidden }, extra) => {
    const requestSender = createMCPRequestSender();

    const result = await requestSender.sendRequest(
      getPageElementsProtocol,
      { tabId, selector, includeHidden },
      extra,
    );

    if (isOk(result)) {
      const response = result[0];
      
      if (response.elements.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No interactive elements found on the page.",
            },
          ],
        };
      }

      const elementsText = response.elements
        .map((element, index) => {
          let elementInfo = `${index + 1}. ${element.tagName.toUpperCase()}`;
          
          if (element.text.trim()) {
            elementInfo += ` - "${element.text.trim()}"`;
          }
          
          elementInfo += `\n   Selector: ${element.selector}`;
          
          if (element.attributes.href) {
            elementInfo += `\n   URL: ${element.attributes.href}`;
          }
          
          if (element.attributes.type) {
            elementInfo += `\n   Type: ${element.attributes.type}`;
          }
          
          if (element.boundingRect) {
            elementInfo += `\n   Position: (${element.boundingRect.x}, ${element.boundingRect.y})`;
          }
          
          return elementInfo;
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${response.elements.length} interactive elements:\n\n${elementsText}`,
          },
        ],
      };
    } else {
      const error = result[1];
      return {
        content: [
          {
            type: "text",
            text: `Failed to get page elements: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
});