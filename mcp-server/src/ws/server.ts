import z from "zod";
import { safeJSONParse } from "@surf-mcp/shared/utils";
import { isErr } from "@surf-mcp/shared/result";

const MessageSchema = z.object({
  type: z.string(),
  requestId: z.string(),
  data: z.any(),
});

export const wsServer = Bun.serve({
  port: 3000,
  fetch: (req, server) => {
    if (server.upgrade(req)) {
      return;
    }

    return new Response("Hello World!");
  },
  websocket: {
    open(ws) {},
    message(ws, msg) {
      const [message, error] = safeJSONParse(msg);
      if (error) {
        console.error(error);
        return;
      }

      const parsedMessageResult = MessageSchema.safeParse(message);
      if (parsedMessageResult.error) {
        console.error(parsedMessageResult.error);
        return;
      }

      const parsedMessage = parsedMessageResult.data;
    },
  },
});
