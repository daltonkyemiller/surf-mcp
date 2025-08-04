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

