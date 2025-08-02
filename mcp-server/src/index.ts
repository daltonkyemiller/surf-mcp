import { mcpServer } from "./mcp";
import { wsServer } from "./ws";

process.on("SIGINT", () => {
  wsServer.stop();
  process.exit();
});

process.on("SIGTERM", () => {
  wsServer.stop();
  process.exit();
});

process.stdin.on("close", () => {
  mcpServer.close();
  wsServer.stop();
  process.exit(0);
});

