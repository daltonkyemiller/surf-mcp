import z from "zod";
import { defineProtocol } from "../protocol";

// Browser-specific protocol definitions

// Open Tab Protocol
export const OpenTabRequestSchema = z.object({
  url: z.string().url(),
  active: z.boolean().optional(),
});

export const OpenTabResponseSchema = z.object({
  tabId: z.number(),
  success: z.boolean(),
});

export const openTabProtocol = defineProtocol(
  "open-tab",
  OpenTabRequestSchema,
  OpenTabResponseSchema,
);

export type OpenTabRequest = z.infer<typeof OpenTabRequestSchema>;
export type OpenTabResponse = z.infer<typeof OpenTabResponseSchema>;

// Close Tab Protocol
export const CloseTabRequestSchema = z.object({
  tabId: z.number(),
});

export const CloseTabResponseSchema = z.object({
  success: z.boolean(),
});

export const closeTabProtocol = defineProtocol(
  "close-tab",
  CloseTabRequestSchema,
  CloseTabResponseSchema,
);

export type CloseTabRequest = z.infer<typeof CloseTabRequestSchema>;
export type CloseTabResponse = z.infer<typeof CloseTabResponseSchema>;

// Get Active Tab Protocol
export const GetActiveTabRequestSchema = z.object({});

export const GetActiveTabResponseSchema = z.object({
  tabId: z.number(),
  url: z.string(),
  title: z.string(),
});

export const getActiveTabProtocol = defineProtocol(
  "get-active-tab",
  GetActiveTabRequestSchema,
  GetActiveTabResponseSchema,
);

export type GetActiveTabRequest = z.infer<typeof GetActiveTabRequestSchema>;
export type GetActiveTabResponse = z.infer<typeof GetActiveTabResponseSchema>;

// Get Tabs Protocol
export const GetTabsRequestSchema = z.object({});

export const GetTabsResponseSchema = z.object({
  tabs: z.array(z.object({
    tabId: z.number(),
    url: z.string(),
    title: z.string(),
    active: z.boolean(),
  })),
});

export const getTabsProtocol = defineProtocol(
  "get-tabs",
  GetTabsRequestSchema,
  GetTabsResponseSchema,
);

export type GetTabsRequest = z.infer<typeof GetTabsRequestSchema>;
export type GetTabsResponse = z.infer<typeof GetTabsResponseSchema>;

// Get Tab Content Protocol
export const GetTabContentRequestSchema = z.object({
  tabId: z.number(),
  offset: z.number(),
});

export const GetTabContentResponseSchema = z.object({
  fullText: z.string(),
  links: z.array(z.object({
    text: z.string(),
    url: z.string(),
  })),
  isTruncated: z.boolean(),
  totalLength: z.number(),
});

export const getTabContentProtocol = defineProtocol(
  "get-tab-content",
  GetTabContentRequestSchema,
  GetTabContentResponseSchema,
);

export type GetTabContentRequest = z.infer<typeof GetTabContentRequestSchema>;
export type GetTabContentResponse = z.infer<typeof GetTabContentResponseSchema>;

// Click Element Protocol
export const ClickElementRequestSchema = z.object({
  tabId: z.number(),
  selector: z.string().describe("CSS selector for the element to click"),
  waitForNavigation: z.boolean().optional().describe("Whether to wait for navigation after click"),
});

export const ClickElementResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  navigated: z.boolean().optional().describe("Whether navigation occurred after click"),
});

export const clickElementProtocol = defineProtocol(
  "click-element",
  ClickElementRequestSchema,
  ClickElementResponseSchema,
);

export type ClickElementRequest = z.infer<typeof ClickElementRequestSchema>;
export type ClickElementResponse = z.infer<typeof ClickElementResponseSchema>;

// Navigate to URL Protocol
export const NavigateToUrlRequestSchema = z.object({
  tabId: z.number(),
  url: z.string().url(),
  waitForLoad: z.boolean().optional().describe("Whether to wait for page load completion"),
});

export const NavigateToUrlResponseSchema = z.object({
  success: z.boolean(),
  finalUrl: z.string().optional().describe("Final URL after navigation (may differ due to redirects)"),
  message: z.string().optional(),
});

export const navigateToUrlProtocol = defineProtocol(
  "navigate-to-url",
  NavigateToUrlRequestSchema,
  NavigateToUrlResponseSchema,
);

export type NavigateToUrlRequest = z.infer<typeof NavigateToUrlRequestSchema>;
export type NavigateToUrlResponse = z.infer<typeof NavigateToUrlResponseSchema>;

// Interact with Element Protocol (for inputs, forms, etc.)
export const InteractElementRequestSchema = z.object({
  tabId: z.number(),
  selector: z.string().describe("CSS selector for the element to interact with"),
  action: z.enum(["type", "clear", "select", "focus", "blur", "scroll-into-view"]),
  value: z.string().optional().describe("Value to type or select option"),
});

export const InteractElementResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  elementValue: z.string().optional().describe("Current value of the element after interaction"),
});

export const interactElementProtocol = defineProtocol(
  "interact-element",
  InteractElementRequestSchema,
  InteractElementResponseSchema,
);

export type InteractElementRequest = z.infer<typeof InteractElementRequestSchema>;
export type InteractElementResponse = z.infer<typeof InteractElementResponseSchema>;

// Get Page Elements Protocol (for finding clickable elements)
export const GetPageElementsRequestSchema = z.object({
  tabId: z.number(),
  selector: z.string().optional().describe("CSS selector to filter elements (default: clickable elements)"),
  includeHidden: z.boolean().optional().describe("Whether to include hidden elements"),
});

export const GetPageElementsResponseSchema = z.object({
  elements: z.array(z.object({
    selector: z.string().describe("Unique CSS selector for this element"),
    tagName: z.string(),
    text: z.string().describe("Visible text content"),
    attributes: z.record(z.string()).describe("Element attributes"),
    boundingRect: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }).optional(),
  })),
});

export const getPageElementsProtocol = defineProtocol(
  "get-page-elements",
  GetPageElementsRequestSchema,
  GetPageElementsResponseSchema,
);

export type GetPageElementsRequest = z.infer<typeof GetPageElementsRequestSchema>;
export type GetPageElementsResponse = z.infer<typeof GetPageElementsResponseSchema>;

// Inject Script Protocol
export const InjectScriptRequestSchema = z.object({
  tabId: z.number(),
  code: z.string().describe("JavaScript code to inject and execute"),
  returnResult: z.boolean().optional().describe("Whether to return the execution result (default: false)"),
});

export const InjectScriptResponseSchema = z.object({
  success: z.boolean(),
  result: z.any().optional().describe("Result of script execution if returnResult was true"),
  error: z.string().optional().describe("Error message if execution failed"),
});

export const injectScriptProtocol = defineProtocol(
  "inject-script",
  InjectScriptRequestSchema,
  InjectScriptResponseSchema,
);

export type InjectScriptRequest = z.infer<typeof InjectScriptRequestSchema>;
export type InjectScriptResponse = z.infer<typeof InjectScriptResponseSchema>;

// Edit Page Content Protocol
export const EditPageContentRequestSchema = z.object({
  tabId: z.number(),
  selector: z.string().describe("CSS selector for the element to edit"),
  content: z.string().describe("New content to set (innerHTML)"),
  contentType: z.enum(["text", "html"]).optional().describe("Type of content to set (default: html)"),
});

export const EditPageContentResponseSchema = z.object({
  success: z.boolean(),
  previousContent: z.string().optional().describe("Previous content of the element"),
  message: z.string().optional(),
});

export const editPageContentProtocol = defineProtocol(
  "edit-page-content",
  EditPageContentRequestSchema,
  EditPageContentResponseSchema,
);

export type EditPageContentRequest = z.infer<typeof EditPageContentRequestSchema>;
export type EditPageContentResponse = z.infer<typeof EditPageContentResponseSchema>;

