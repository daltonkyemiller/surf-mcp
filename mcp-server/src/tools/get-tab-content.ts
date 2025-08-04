import z from "zod";
import { ToolRegistry } from "../tool-registry";
import { createMCPRequestSender } from "../request-handler";
import { getTabContentProtocol } from "@surf-mcp/shared/protocols/browser";
import { isOk } from "@surf-mcp/shared/result";

export const getTabContentTool = ToolRegistry.createToolDefinition({
  name: "get-tab-content",
  description: "Get the full text content of the webpage and the list of links in the webpage, by tab ID. Use 'offset' only for larger documents when the first call was truncated and if you require more content in order to assist the user.",
  schema: {
    tabId: z.number().describe("The ID of the tab to get content from"),
    offset: z.number().default(0).describe("Number of characters to skip from the beginning (for pagination of large content)"),
  },
  handler: async ({ tabId, offset }, extra) => {
    const requestSender = createMCPRequestSender();

    const result = await requestSender.sendRequest(
      getTabContentProtocol,
      { tabId, offset },
      extra,
    );

    if (isOk(result)) {
      const response = result[0];
      let content: { type: "text"; text: string }[] = [];
      
      // Add truncation hint if needed
      if (response.isTruncated || offset > 0) {
        const rangeString = `${offset}-${offset + response.fullText.length}`;
        content.push({
          type: "text",
          text: `The following text content is truncated due to size (includes character range ${rangeString} out of ${response.totalLength}). If you want to read characters beyond this range, please use the 'get-tab-content' tool with an offset.`,
        });
      }
      
      // Add the main text content
      content.push({
        type: "text",
        text: response.fullText,
      });
      
      // Add links (only on first chunk to avoid duplicates)
      if (offset === 0 && response.links.length > 0) {
        const linksText = response.links
          .map(link => `Link text: ${link.text}, Link URL: ${link.url}`)
          .join("\n");
        content.push({
          type: "text",
          text: `\n\nLinks found on the page:\n${linksText}`,
        });
      }
      
      return {
        content,
      };
    } else {
      const error = result[1];
      return {
        content: [
          {
            type: "text",
            text: `Failed to get tab content: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
});