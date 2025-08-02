
export const wsServer = Bun.serve({
  port: 3000,
  fetch: (req, server) => {
    if (server.upgrade(req)) {
      return;
    }

    return new Response("Hello World!");
  },
  websocket: {
    open(ws) {
      ws.subscribe("open-tab");
    },
    message: (ws, msg) => {
      console.log("got message", msg);
      if (msg === "ping") {
        ws.send("pong");
        return;
      }
    },
  },
});
