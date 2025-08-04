import { TypedClient } from "@surf-mcp/shared/client";
import {
  openTabProtocol,
  closeTabProtocol,
  getActiveTabProtocol,
  getTabsProtocol,
  getTabContentProtocol,
} from "@surf-mcp/shared/protocols/browser";
import type {
  OpenTabRequest,
  CloseTabRequest,
  GetActiveTabRequest,
  GetTabsRequest,
  GetTabContentRequest,
} from "@surf-mcp/shared/protocols/browser";

export class WSClient extends TypedClient {
  constructor(url: string = "ws://localhost:3000") {
    super({ url });
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle open-tab requests
    this.on(openTabProtocol, async (payload: OpenTabRequest) => {
      try {
        const tab = await browser.tabs.create({
          url: payload.url,
          active: payload.active ?? true,
        });

        // Send response back through WebSocket
        return {
          tabId: tab.id!,
          success: true,
        };
      } catch (error) {
        console.error("Failed to open tab:", error);
        throw new Error(
          `Failed to open tab: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    // Handle close-tab requests
    this.on(closeTabProtocol, async (payload: CloseTabRequest) => {
      try {
        await browser.tabs.remove(payload.tabId);
        return {
          success: true,
        };
      } catch (error) {
        console.error("Failed to close tab:", error);
        throw new Error(
          `Failed to close tab: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    // Handle get-active-tab requests
    this.on(getActiveTabProtocol, async (payload: GetActiveTabRequest) => {
      try {
        const [activeTab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!activeTab) {
          throw new Error("No active tab found");
        }

        return {
          tabId: activeTab.id!,
          url: activeTab.url || "",
          title: activeTab.title || "",
        };
      } catch (error) {
        console.error("Failed to get active tab:", error);
        throw new Error(
          `Failed to get active tab: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    // Handle get-tabs requests
    this.on(getTabsProtocol, async (payload: GetTabsRequest) => {
      try {
        const tabs = await browser.tabs.query({});

        return {
          tabs: tabs.map((tab) => ({
            tabId: tab.id!,
            url: tab.url || "",
            title: tab.title || "",
            active: tab.active || false,
          })),
        };
      } catch (error) {
        console.error("Failed to get tabs:", error);
        throw new Error(
          `Failed to get tabs: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    // Handle get-tab-content requests
    this.on(getTabContentProtocol, async (payload: GetTabContentRequest) => {
      try {
        // Execute content script to extract page content
        const results = await browser.scripting.executeScript({
          target: { tabId: payload.tabId },
          func: extractPageContent,
          args: [payload.offset],
        });

        const result = results[0]?.result;
        if (!result) {
          throw new Error("Failed to extract page content");
        }

        return result;
      } catch (error) {
        console.error("Failed to get tab content:", error);
        throw new Error(
          `Failed to get tab content: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  async initialize(): Promise<void> {
    const result = await this.connect();
    if (result[1]) {
      console.error("Failed to connect to WebSocket server:", result[1]);
      throw result[1];
    }
    console.log("WebSocket client connected successfully");
  }
}

// Function to be injected into web pages to extract content
function extractPageContent(offset: number) {
  const CHUNK_SIZE = 50000; // Characters per chunk

  // Get full text content
  const textContent =
    document.body.innerText || document.body.textContent || "";
  const totalLength = textContent.length;

  // Apply offset and limit
  const endIndex = Math.min(offset + CHUNK_SIZE, totalLength);
  const fullText = textContent.slice(offset, endIndex);
  const isTruncated = endIndex < totalLength;

  // Extract links (only on first chunk to avoid duplicates)
  let links: { text: string; url: string }[] = [];
  if (offset === 0) {
    const linkElements = document.querySelectorAll("a[href]");
    links = Array.from(linkElements)
      .map((link) => ({
        text: (link.textContent || "").trim(),
        url: (link as HTMLAnchorElement).href,
      }))
      .filter((link) => link.text && link.url)
      .slice(0, 100); // Limit to first 100 links
  }

  return {
    fullText,
    links,
    isTruncated,
    totalLength,
  };
}
