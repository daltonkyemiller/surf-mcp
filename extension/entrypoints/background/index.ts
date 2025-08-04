import { WSClient } from './ws-client';

export default defineBackground(() => {
  console.log('Surf MCP background script started');
  
  // Initialize WebSocket client
  const wsClient = new WSClient();
  
  wsClient.initialize().catch((error) => {
    console.error('Failed to initialize WebSocket client:', error);
  });
});
