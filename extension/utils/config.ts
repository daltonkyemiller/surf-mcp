import { storage } from "#imports";

export interface ExtensionConfig {
  websocketPort: number;
  autoReconnect: boolean;
  maxReconnectInterval: number;
  heartbeatInterval: number;
}

export const defaultConfig: ExtensionConfig = {
  websocketPort: 4321,
  autoReconnect: true,
  maxReconnectInterval: 5000,
  heartbeatInterval: 15000,
};

// Storage items for configuration
export const configStorage = {
  websocketPort: storage.defineItem<number>("local:websocket-port", {
    fallback: defaultConfig.websocketPort,
  }),
  autoReconnect: storage.defineItem<boolean>("local:auto-reconnect", {
    fallback: defaultConfig.autoReconnect,
  }),
  maxReconnectInterval: storage.defineItem<number>("local:max-reconnect-interval", {
    fallback: defaultConfig.maxReconnectInterval,
  }),
  heartbeatInterval: storage.defineItem<number>("local:heartbeat-interval", {
    fallback: defaultConfig.heartbeatInterval,
  }),
};

// Utility functions
export async function getConfig(): Promise<ExtensionConfig> {
  const [websocketPort, autoReconnect, maxReconnectInterval, heartbeatInterval] = await Promise.all([
    configStorage.websocketPort.getValue(),
    configStorage.autoReconnect.getValue(),
    configStorage.maxReconnectInterval.getValue(),
    configStorage.heartbeatInterval.getValue(),
  ]);
  return { websocketPort, autoReconnect, maxReconnectInterval, heartbeatInterval };
}

export async function updateConfig(
  config: Partial<ExtensionConfig>,
): Promise<void> {
  const promises: Promise<void>[] = [];
  
  if (config.websocketPort !== undefined) {
    promises.push(configStorage.websocketPort.setValue(config.websocketPort));
  }
  if (config.autoReconnect !== undefined) {
    promises.push(configStorage.autoReconnect.setValue(config.autoReconnect));
  }
  if (config.maxReconnectInterval !== undefined) {
    promises.push(configStorage.maxReconnectInterval.setValue(config.maxReconnectInterval));
  }
  if (config.heartbeatInterval !== undefined) {
    promises.push(configStorage.heartbeatInterval.setValue(config.heartbeatInterval));
  }
  
  await Promise.all(promises);
}

