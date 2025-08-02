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
    message(ws, msg) {},
  },
});
