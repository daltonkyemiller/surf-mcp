import { WSClient } from "./ws-client";
import { getConfig, configStorage } from "@/utils/config";

let wsClient: WSClient | null = null;

export default defineBackground(() => {
  console.log("Surf MCP background script started");

  // Initialize WebSocket client with configured port
  initializeClient();

  // Set up listener for port changes
  setupPortChangeListener();
  
  // Set up message listener for popup communication
  setupMessageListener();
});

async function initializeClient() {
  try {
    const config = await getConfig();
    wsClient = new WSClient(config.websocketPort);
    
    // Apply configuration to client
    wsClient.setAutoReconnect(config.autoReconnect);
    wsClient.setReconnectionOptions({
      maxInterval: config.maxReconnectInterval,
      initialInterval: 1000,
      jitterMs: 200
    });

    await wsClient.initialize();
    console.log(`WebSocket client initialized with port ${config.websocketPort}`);
  } catch (error) {
    console.error("Failed to initialize WebSocket client:", error);
  }
}

function setupPortChangeListener() {
  // Listen for changes to configuration
  configStorage.websocketPort.watch((newPort, oldPort) => {
    if (newPort !== oldPort) {
      console.log(
        `Port changed from ${oldPort} to ${newPort}, reconnecting...`,
      );
      handlePortChange(newPort);
    }
  });
  
  configStorage.autoReconnect.watch((newValue, oldValue) => {
    if (newValue !== oldValue && wsClient) {
      console.log(`Auto-reconnect changed to ${newValue}`);
      wsClient.setAutoReconnect(newValue);
    }
  });
  
  configStorage.maxReconnectInterval.watch(async (newValue, oldValue) => {
    if (newValue !== oldValue && wsClient) {
      console.log(`Max reconnect interval changed to ${newValue}ms`);
      wsClient.setReconnectionOptions({ maxInterval: newValue });
    }
  });
}

async function handlePortChange(newPort: number) {
  if (!wsClient) {
    console.log("No existing client, creating new one with port", newPort);
    try {
      const config = await getConfig();
      wsClient = new WSClient(newPort);
      wsClient.setAutoReconnect(config.autoReconnect);
      wsClient.setReconnectionOptions({
        maxInterval: config.maxReconnectInterval,
        initialInterval: 1000,
        jitterMs: 200
      });
      await wsClient.initialize();
    } catch (error) {
      console.error("Failed to create new WebSocket client:", error);
    }
    return;
  }

  try {
    await wsClient.reconnect(newPort);
    console.log(`Successfully reconnected to port ${newPort}`);
  } catch (error) {
    console.error(`Failed to reconnect to port ${newPort}:`, error);
    // If reconnection fails, try to create a fresh client
    try {
      const config = await getConfig();
      wsClient = new WSClient(newPort);
      wsClient.setAutoReconnect(config.autoReconnect);
      wsClient.setReconnectionOptions({
        maxInterval: config.maxReconnectInterval,
        initialInterval: 1000,
        jitterMs: 200
      });
      await wsClient.initialize();
      console.log("Created fresh WebSocket client after reconnection failure");
    } catch (initError) {
      console.error("Failed to create fresh WebSocket client:", initError);
    }
  }
}

async function handleManualReconnect() {
  if (!wsClient) {
    console.log("No client available, initializing new one");
    await initializeClient();
    return;
  }

  try {
    const config = await getConfig();
    await wsClient.reconnect(config.websocketPort);
    console.log("Manual reconnect successful");
  } catch (error) {
    console.error("Manual reconnect failed:", error);
    throw error;
  }
}

function setupMessageListener() {
  // Listen for messages from popup
  browser.runtime.onMessage.addListener(
    (request: any, sender: any, sendResponse: any) => {
      if (request.action === 'getConnectionStatus') {
        const status = wsClient ? wsClient.getConnectionStatus() : {
          state: 'disconnected',
          port: 0,
          attempts: 0
        };
        sendResponse(status);
        return true;
      }
      
      if (request.action === 'manualReconnect') {
        handleManualReconnect().then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
        return true;
      }
      
      return false;
    }
  );
}
