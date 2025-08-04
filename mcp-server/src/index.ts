import { mcpServer } from "./mcp/server";
import { wsServer } from "./ws/server";

// Start the WebSocket server
wsServer.start(3000);

process.on("SIGINT", () => {
  wsServer.stop();
  mcpServer.close();
  process.exit();
});

process.on("SIGTERM", () => {
  wsServer.stop();
  mcpServer.close();
  process.exit();
});

process.stdin.on("close", () => {
  mcpServer.close();
  wsServer.stop();
  process.exit(0);
});
