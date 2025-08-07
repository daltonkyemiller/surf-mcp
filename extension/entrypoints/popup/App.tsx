import { useState, useEffect } from "react";
import { getConfig, updateConfig, defaultConfig } from "@/utils/config";

function App() {
  const [websocketPort, setWebsocketPort] = useState<number>(
    defaultConfig.websocketPort,
  );
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({
    type: null,
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    state: string;
    port: number;
    attempts: number;
  } | null>(null);

  // Load current configuration on mount
  useEffect(() => {
    loadConfig();
    loadConnectionStatus();
    
    // Poll connection status every 2 seconds
    const interval = setInterval(loadConnectionStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getConfig();
      setWebsocketPort(config.websocketPort);
    } catch (error) {
      console.error("Failed to load config:", error);
      setStatus({ type: "error", message: "Failed to load current settings" });
    }
  };
  
  const loadConnectionStatus = async () => {
    try {
      const response = await browser.runtime.sendMessage({ action: 'getConnectionStatus' });
      setConnectionStatus(response);
    } catch (error) {
      console.error("Failed to load connection status:", error);
    }
  };

  const handleSave = async () => {
    if (websocketPort < 1 || websocketPort > 65535) {
      setStatus({ type: "error", message: "Port must be between 1 and 65535" });
      return;
    }

    setIsLoading(true);
    try {
      await updateConfig({ websocketPort });
      setStatus({
        type: "success",
        message: "Settings saved! WebSocket will reconnect automatically.",
      });
    } catch (error) {
      console.error("Failed to save config:", error);
      setStatus({ type: "error", message: "Failed to save settings" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await updateConfig({ websocketPort: defaultConfig.websocketPort });
      setWebsocketPort(defaultConfig.websocketPort);
      setStatus({
        type: "success",
        message: "Settings reset to default values. WebSocket will reconnect automatically.",
      });
    } catch (error) {
      console.error("Failed to reset config:", error);
      setStatus({ type: "error", message: "Failed to reset settings" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualReconnect = async () => {
    setIsLoading(true);
    try {
      const response = await browser.runtime.sendMessage({ action: 'manualReconnect' });
      if (response.success) {
        setStatus({
          type: "success",
          message: "Manual reconnect initiated successfully.",
        });
        await loadConnectionStatus();
      } else {
        setStatus({
          type: "error",
          message: `Reconnect failed: ${response.error}`,
        });
      }
    } catch (error) {
      console.error("Failed to trigger manual reconnect:", error);
      setStatus({ type: "error", message: "Failed to trigger manual reconnect" });
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectionStatusColor = (state: string) => {
    switch (state) {
      case 'connected': return 'text-green-600';
      case 'connecting': case 'reconnecting': return 'text-yellow-600';
      case 'failed': case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusText = (state: string, attempts: number) => {
    switch (state) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return attempts > 1 ? `Reconnecting (attempt ${attempts})` : 'Reconnecting...';
      case 'failed': return 'Connection failed';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="p-10 min-w-80 bg-gray-900 text-white min-h-screen">
      <h2 className="text-xl font-bold mb-6 text-white">Surf MCP Configuration</h2>
      
      {connectionStatus && (
        <div className="mb-5 p-3 bg-gray-800 rounded border border-gray-700">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-200">Connection Status:</span>
            <span className={`font-medium ${getConnectionStatusColor(connectionStatus.state)}`}>
              {getConnectionStatusText(connectionStatus.state, connectionStatus.attempts)}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Port: {connectionStatus.port}
          </div>
          {(connectionStatus.state === 'failed' || connectionStatus.state === 'disconnected') && (
            <button
              onClick={handleManualReconnect}
              disabled={isLoading}
              className="mt-2 bg-blue-600 text-white px-3 py-1 text-sm rounded disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              {isLoading ? "Reconnecting..." : "Reconnect"}
            </button>
          )}
        </div>
      )}

      <div className="mb-5">
        <label htmlFor="websocket-port" className="block mb-2 font-medium text-gray-200">
          WebSocket Server Port:
        </label>
        <input
          type="number"
          id="websocket-port"
          value={websocketPort}
          onChange={(e) => setWebsocketPort(Number(e.target.value))}
          min="1"
          max="65535"
          className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white focus:border-blue-500 focus:outline-none"
          disabled={isLoading}
        />
      </div>

      <div className="mb-5">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded mr-2 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {isLoading ? "Saving..." : "Save Settings"}
        </button>
        <button
          onClick={handleReset}
          disabled={isLoading}
          className="bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-700"
        >
          Reset to Default
        </button>
      </div>

      {status.type && (
        <div
          className={`p-2 rounded ${
            status.type === "success"
              ? "bg-green-900 text-green-300 border border-green-700"
              : "bg-red-900 text-red-300 border border-red-700"
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}

export default App;
