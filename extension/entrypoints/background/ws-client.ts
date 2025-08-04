import { TypedClient } from "@surf-mcp/shared/client";
import {
  openTabProtocol,
  closeTabProtocol,
  getActiveTabProtocol,
  getTabsProtocol,
  getTabContentProtocol,
  clickElementProtocol,
  navigateToUrlProtocol,
  interactElementProtocol,
  getPageElementsProtocol,
  injectScriptProtocol,
  editPageContentProtocol,
} from "@surf-mcp/shared/protocols/browser";
import type {
  OpenTabRequest,
  CloseTabRequest,
  GetActiveTabRequest,
  GetTabsRequest,
  GetTabContentRequest,
  ClickElementRequest,
  NavigateToUrlRequest,
  InteractElementRequest,
  GetPageElementsRequest,
  InjectScriptRequest,
  EditPageContentRequest,
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

    // Handle click-element requests
    this.on(clickElementProtocol, async (payload: ClickElementRequest) => {
      try {
        const results = await browser.scripting.executeScript({
          target: { tabId: payload.tabId },
          func: clickElement,
          args: [payload.selector, payload.waitForNavigation],
        });

        const result = results[0]?.result;
        if (!result) {
          throw new Error("Failed to click element");
        }

        return result;
      } catch (error) {
        console.error("Failed to click element:", error);
        throw new Error(
          `Failed to click element: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    // Handle navigate-to-url requests
    this.on(navigateToUrlProtocol, async (payload: NavigateToUrlRequest) => {
      try {
        const tab = await browser.tabs.get(payload.tabId);
        if (!tab) {
          throw new Error(`Tab ${payload.tabId} not found`);
        }

        await browser.tabs.update(payload.tabId, { url: payload.url });

        if (payload.waitForLoad !== false) {
          await waitForTabLoad(payload.tabId);
        }

        const updatedTab = await browser.tabs.get(payload.tabId);
        return {
          success: true,
          finalUrl: updatedTab.url || payload.url,
        };
      } catch (error) {
        console.error("Failed to navigate to URL:", error);
        throw new Error(
          `Failed to navigate to URL: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    // Handle interact-element requests
    this.on(interactElementProtocol, async (payload: InteractElementRequest) => {
      try {
        const results = await browser.scripting.executeScript({
          target: { tabId: payload.tabId },
          func: interactWithElement,
          args: [payload.selector, payload.action, payload.value],
        });

        const result = results[0]?.result;
        if (!result) {
          throw new Error("Failed to interact with element");
        }

        return result;
      } catch (error) {
        console.error("Failed to interact with element:", error);
        throw new Error(
          `Failed to interact with element: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    // Handle get-page-elements requests
    this.on(getPageElementsProtocol, async (payload: GetPageElementsRequest) => {
      try {
        const results = await browser.scripting.executeScript({
          target: { tabId: payload.tabId },
          func: getPageElements,
          args: [payload.selector, payload.includeHidden],
        });

        const result = results[0]?.result;
        if (!result) {
          throw new Error("Failed to get page elements - script execution returned no result");
        }

        // Validate the result has the expected structure
        if (typeof result !== 'object' || !Array.isArray(result.elements)) {
          console.error("Invalid result structure:", result);
          throw new Error("Failed to get page elements - invalid result structure");
        }

        return result;
      } catch (error) {
        console.error("Failed to get page elements:", error);
        throw new Error(
          `Failed to get page elements: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    // Handle inject-script requests
    this.on(injectScriptProtocol, async (payload: InjectScriptRequest) => {
      try {
        const results = await browser.scripting.executeScript({
          target: { tabId: payload.tabId },
          func: injectScript,
          args: [payload.code, payload.returnResult],
        });

        const result = results[0]?.result;
        if (result === undefined) {
          throw new Error("Failed to inject script - no result returned");
        }

        return result;
      } catch (error) {
        console.error("Failed to inject script:", error);
        throw new Error(
          `Failed to inject script: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    // Handle edit-page-content requests
    this.on(editPageContentProtocol, async (payload: EditPageContentRequest) => {
      try {
        const results = await browser.scripting.executeScript({
          target: { tabId: payload.tabId },
          func: editPageContent,
          args: [payload.selector, payload.content, payload.contentType],
        });

        const result = results[0]?.result;
        if (!result) {
          throw new Error("Failed to edit page content - no result returned");
        }

        return result;
      } catch (error) {
        console.error("Failed to edit page content:", error);
        throw new Error(
          `Failed to edit page content: ${error instanceof Error ? error.message : String(error)}`,
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

// Helper function to wait for tab load
async function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      reject(new Error("Tab load timeout"));
    }, 30000);

    const listener = (updatedTabId: number, changeInfo: any) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeout);
        browser.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    browser.tabs.onUpdated.addListener(listener);
  });
}

// Function to be injected into web pages to click elements
function clickElement(selector: string, waitForNavigation?: boolean) {
  const element = document.querySelector(selector);
  if (!element) {
    return {
      success: false,
      message: `Element not found: ${selector}`,
    };
  }

  const initialUrl = window.location.href;
  
  try {
    // Scroll element into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Click the element
    (element as HTMLElement).click();
    
    // Check if navigation occurred (for immediate redirects)
    const navigated = window.location.href !== initialUrl;
    
    return {
      success: true,
      navigated,
      message: navigated ? "Element clicked, navigation occurred" : "Element clicked successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to click element: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Function to be injected into web pages to interact with elements
function interactWithElement(selector: string, action: string, value?: string) {
  const element = document.querySelector(selector) as HTMLElement;
  if (!element) {
    return {
      success: false,
      message: `Element not found: ${selector}`,
    };
  }

  try {
    switch (action) {
      case "type":
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.focus();
          element.value = value || "";
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return {
            success: true,
            elementValue: element.value,
            message: `Typed "${value}" into element`,
          };
        } else {
          return {
            success: false,
            message: "Element is not a text input",
          };
        }

      case "clear":
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.focus();
          element.value = "";
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return {
            success: true,
            elementValue: "",
            message: "Element cleared",
          };
        } else {
          return {
            success: false,
            message: "Element is not a text input",
          };
        }

      case "select":
        if (element instanceof HTMLSelectElement) {
          element.value = value || "";
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return {
            success: true,
            elementValue: element.value,
            message: `Selected option "${value}"`,
          };
        } else {
          return {
            success: false,
            message: "Element is not a select element",
          };
        }

      case "focus":
        element.focus();
        return {
          success: true,
          message: "Element focused",
        };

      case "blur":
        element.blur();
        return {
          success: true,
          message: "Element blurred",
        };

      case "scroll-into-view":
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return {
          success: true,
          message: "Element scrolled into view",
        };

      default:
        return {
          success: false,
          message: `Unknown action: ${action}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to interact with element: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Function to be injected into web pages to get interactive elements
function getPageElements(selector?: string, includeHidden?: boolean) {
  try {
    // Default selector for interactive elements
    const defaultSelector = 'a, button, input, select, textarea, [onclick], [role="button"], [tabindex]:not([tabindex="-1"])';
    const querySelector = selector || defaultSelector;
    
    let elements: Element[];
    try {
      elements = Array.from(document.querySelectorAll(querySelector));
    } catch (selectorError) {
      console.error("Invalid selector:", querySelector, selectorError);
      // Fallback to default selector if custom selector is invalid
      elements = Array.from(document.querySelectorAll(defaultSelector));
    }
    
    const results = elements
      .map((element, index) => {
        try {
          const rect = element.getBoundingClientRect();
          const computedStyle = getComputedStyle(element);
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           computedStyle.visibility !== 'hidden' &&
                           computedStyle.display !== 'none';
          
          if (!includeHidden && !isVisible) {
            return null;
          }

          // Generate a unique selector for this element
          let uniqueSelector = element.tagName.toLowerCase();
          if (element.id) {
            uniqueSelector = `#${element.id}`;
          } else if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).slice(0, 2).join('.');
            if (classes) {
              uniqueSelector = `${uniqueSelector}.${classes}`;
            }
          }
          
          // Add nth-child if selector isn't unique enough
          try {
            const sameElements = document.querySelectorAll(uniqueSelector);
            if (sameElements.length > 1) {
              const parent = element.parentElement;
              if (parent) {
                const siblings = Array.from(parent.children);
                const siblingIndex = siblings.indexOf(element) + 1;
                uniqueSelector = `${uniqueSelector}:nth-child(${siblingIndex})`;
              }
            }
          } catch (e) {
            // If selector generation fails, use a fallback
            uniqueSelector = element.tagName.toLowerCase();
          }

          // Extract attributes safely
          const attributes: Record<string, string> = {};
          try {
            for (const attr of element.attributes) {
              attributes[attr.name] = attr.value || '';
            }
          } catch (e) {
            console.warn("Failed to extract attributes for element:", element);
          }

          return {
            selector: uniqueSelector,
            tagName: element.tagName.toLowerCase(),
            text: (element.textContent || (element as HTMLElement).innerText || "").trim().slice(0, 100),
            attributes,
            boundingRect: isVisible ? {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            } : undefined,
          };
        } catch (elementError) {
          console.warn("Failed to process element:", element, elementError);
          return null;
        }
      })
      .filter(Boolean)
      .slice(0, 50); // Limit to 50 elements to avoid overwhelming responses

    return {
      elements: results,
    };
  } catch (error) {
    console.error("Failed to get page elements:", error);
    // Return a valid structure even on error
    return {
      elements: [],
    };
  }
}

// Function to be injected into web pages to execute arbitrary scripts
function injectScript(code: string, returnResult?: boolean) {
  try {
    // Create a script element and execute the code
    const result = eval(code);
    
    return {
      success: true,
      result: returnResult ? result : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Function to be injected into web pages to edit content
function editPageContent(selector: string, content: string, contentType?: string) {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      return {
        success: false,
        message: `Element not found: ${selector}`,
      };
    }

    const previousContent = contentType === 'text' ? element.textContent || '' : element.innerHTML;
    
    if (contentType === 'text') {
      element.textContent = content;
    } else {
      element.innerHTML = content;
    }
    
    return {
      success: true,
      previousContent,
      message: `Successfully updated ${contentType || 'html'} content for element "${selector}"`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to edit content: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
