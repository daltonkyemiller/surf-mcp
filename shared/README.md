# Surf MCP Shared

A shared library package that provides common types, protocols, utilities, and communication primitives for the Surf MCP project. This package enables type-safe communication between the MCP server and browser extension through WebSocket connections.

## Features

- **Protocol Definitions**: Type-safe protocol definitions for browser automation
- **WebSocket Client/Server**: Typed WebSocket communication primitives
- **Result Types**: Error handling utilities and result types
- **Shared Utilities**: Common utility functions and helpers
- **Type Safety**: Full TypeScript support with Zod schema validation

## Architecture

The shared package provides:

- **Protocol Registry**: Centralized protocol registration and management
- **Typed Client**: WebSocket client with protocol-aware communication
- **Typed Server**: WebSocket server with automatic message routing
- **Result Handling**: Type-safe error and success result handling
- **Schema Validation**: Runtime type validation using Zod schemas

## Exports

### Core Exports
- `result`: Result types and utilities for error handling
- `utils`: Common utility functions
- `protocol`: Protocol definition and registry utilities
- `client`: Typed WebSocket client implementation
- `server`: Typed WebSocket server implementation

### Protocol Exports
- `protocols/browser`: All browser automation protocol definitions

## Browser Protocols

### Tab Management Protocols
- `open-tab`: Create new browser tabs
- `close-tab`: Close existing tabs
- `get-active-tab`: Get active tab information
- `get-tabs`: List all open tabs
- `get-tab-content`: Extract page content and links

### Page Interaction Protocols
- `click-element`: Click elements using CSS selectors
- `interact-element`: Interact with form elements (type, clear, select, focus, blur)
- `navigate-to-url`: Navigate to URLs with optional load waiting
- `get-page-elements`: Find interactive elements on pages
- `inject-script`: Execute JavaScript in web pages
- `edit-page-content`: Modify page content dynamically

## Usage

### Protocol Definition

```typescript
import { defineProtocol } from "@surf-mcp/shared/protocol";
import z from "zod";

const myProtocol = defineProtocol(
  "my-action",
  z.object({ input: z.string() }),
  z.object({ output: z.string() })
);
```

### WebSocket Client

```typescript
import { TypedClient } from "@surf-mcp/shared/client";
import { openTabProtocol } from "@surf-mcp/shared/protocols/browser";

const client = new TypedClient({ url: "ws://localhost:3000" });

client.on(openTabProtocol, async (request) => {
  // Handle open tab request
  return { tabId: 123, success: true };
});
```

### WebSocket Server

```typescript
import { TypedServer } from "@surf-mcp/shared/server";

const server = new TypedServer({ port: 3000 });

server.on("connection", (client) => {
  // Handle new client connections
});
```

### Result Handling

```typescript
import { isOk, createOk, createErr } from "@surf-mcp/shared/result";

function processData(data: string): Result<ProcessedData, Error> {
  try {
    const processed = expensive_operation(data);
    return createOk(processed);
  } catch (error) {
    return createErr(new Error("Processing failed"));
  }
}

const result = processData("input");
if (isOk(result)) {
  console.log("Success:", result[0]);
} else {
  console.error("Error:", result[1]);
}
```

## Type Safety

All protocols are fully typed with Zod schemas for runtime validation:

```typescript
// Request/response types are automatically inferred
type OpenTabRequest = z.infer<typeof OpenTabRequestSchema>;
type OpenTabResponse = z.infer<typeof OpenTabResponseSchema>;

// Protocols enforce type safety at compile time and runtime
const openTabProtocol = defineProtocol(
  "open-tab",
  OpenTabRequestSchema,  // Validates incoming requests
  OpenTabResponseSchema  // Validates outgoing responses
);
```

## Protocol Registry

The protocol registry ensures type-safe communication:

```typescript
import { protocolRegistry } from "@surf-mcp/shared/protocol";
import { openTabProtocol } from "@surf-mcp/shared/protocols/browser";

// Register protocols for automatic validation
protocolRegistry.register(openTabProtocol);

// Protocols are automatically validated on send/receive
```

## Development

### Scripts

- `bun run typecheck`: Run TypeScript type checking

### Adding New Protocols

1. Define request/response schemas using Zod
2. Create protocol using `defineProtocol`
3. Export protocol and types from appropriate module
4. Register protocol in consuming applications

### Schema Validation

All protocol schemas use Zod for runtime validation:

```typescript
const RequestSchema = z.object({
  tabId: z.number(),
  selector: z.string(),
  waitForNavigation: z.boolean().optional()
});
```

## Dependencies

This package has minimal dependencies:
- **Zod**: Runtime type validation and schema definition
- **TypeScript**: Type definitions and compile-time checking

## Integration

This package is designed to be used by:
- **MCP Server**: Implements protocol handlers for browser automation
- **Browser Extension**: Handles protocol requests from MCP server
- **External Tools**: Any application needing browser automation protocols

## Contributing

1. Maintain type safety throughout all additions
2. Use Zod schemas for all data validation
3. Follow existing protocol naming conventions
4. Add comprehensive JSDoc comments
5. Ensure backward compatibility when updating protocols
