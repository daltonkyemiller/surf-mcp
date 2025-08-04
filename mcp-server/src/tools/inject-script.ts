import z from "zod";
import { ToolRegistry } from "../tool-registry";
import { createMCPRequestSender } from "../request-handler";
import { injectScriptProtocol } from "@surf-mcp/shared/protocols/browser";
import { isOk } from "@surf-mcp/shared/result";

export const injectScriptTool = ToolRegistry.createToolDefinition({
  name: "inject-script",
  description: "Inject and execute JavaScript code in a browser tab",
  schema: {
    tabId: z.number().describe("The ID of the tab to inject script into"),
    code: z.string().describe("JavaScript code to inject and execute"),
    returnResult: z.boolean().optional().describe("Whether to return the execution result (default: false)"),
  },
  handler: async ({ tabId, code, returnResult }, extra) => {
    const requestSender = createMCPRequestSender();

    const result = await requestSender.sendRequest(
      injectScriptProtocol,
      { tabId, code, returnResult },
      extra,
    );

    if (isOk(result)) {
      const response = result[0];
      
      if (response.success) {
        let message = `Successfully executed script in tab ${tabId}`;
        
        if (returnResult && response.result !== undefined) {
          message += `\n\nScript result: ${JSON.stringify(response.result, null, 2)}`;
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
              text: `Failed to execute script in tab ${tabId}${response.error ? `: ${response.error}` : ''}`,
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
            text: `Failed to inject script: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
});