import z from "zod";
import { ToolRegistry } from "../tool-registry";
import { createMCPRequestSender } from "../request-handler";
import { editPageContentProtocol } from "@surf-mcp/shared/protocols/browser";
import { isOk } from "@surf-mcp/shared/result";

export const editPageContentTool = ToolRegistry.createToolDefinition({
  name: "edit-page-content",
  description: "Edit the content of page elements by CSS selector",
  schema: {
    tabId: z.number().describe("The ID of the tab to edit content in"),
    selector: z.string().describe("CSS selector for the element to edit"),
    content: z.string().describe("New content to set"),
    contentType: z.enum(["text", "html"]).optional().describe("Type of content to set (default: html)"),
  },
  handler: async ({ tabId, selector, content, contentType }, extra) => {
    const requestSender = createMCPRequestSender();

    const result = await requestSender.sendRequest(
      editPageContentProtocol,
      { tabId, selector, content, contentType },
      extra,
    );

    if (isOk(result)) {
      const response = result[0];
      
      if (response.success) {
        let message = `Successfully updated content for "${selector}" in tab ${tabId}`;
        
        if (response.previousContent !== undefined) {
          message += `\n\nPrevious content: ${response.previousContent.substring(0, 200)}${response.previousContent.length > 200 ? '...' : ''}`;
        }
        
        if (response.message) {
          message += `\n${response.message}`;
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
        return {
          content: [
            {
              type: "text",
              text: `Failed to update content for "${selector}" in tab ${tabId}${response.message ? `: ${response.message}` : ''}`,
            },
          ],
          isError: true,
        };
      }
    } else {
      const error = result[1];
      return {
        content: [
          {
            type: "text",
            text: `Failed to edit page content: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
});