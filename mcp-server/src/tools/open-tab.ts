import z from "zod";
import { ToolRegistry } from "../tool-registry";

export const openTabTool = ToolRegistry.createToolDefinition({
  name: "open-tab",
  description: "Open a new tab in the browser",
  schema: { url: z.string().url() },
  handler: async ({ url }, extra) => {
    return { content: [{ type: "text", text: `Opening ${url}` }] };
  },
});
