# Surf MCP Server

A Model Context Protocol (MCP) server that provides comprehensive browser automation tools. This server exposes web browser functionality through MCP tools, enabling AI assistants to interact with web pages, manage tabs, and perform complex browser automation tasks.

## Features

- **MCP Tool Registry**: Comprehensive browser automation tools exposed via MCP
- **WebSocket Server**: Real-time communication with browser extensions
- **Request Handling**: Type-safe request/response handling between MCP and WebSocket
- **Logging**: Structured logging for debugging and monitoring
- **Browser Integration**: Direct integration with browser extensions via WebSocket

## Architecture

The server consists of:

- **MCP Server**: Exposes browser automation tools to MCP clients
- **WebSocket Server**: Communicates with browser extensions
- **Tool Registry**: Manages and registers all available browser tools
- **Request Handler**: Routes requests between MCP and WebSocket protocols

## Available Tools

### Tab Management
- `open-tab`: Create new browser tabs with specified URLs
- `close-tab`: Close existing browser tabs
- `get-active-tab`: Get information about the currently active tab
- `get-tabs`: List all open browser tabs
- `get-tab-content`: Extract text content and links from web pages

### Page Interaction
- `click-element`: Click on page elements using CSS selectors
- `interact-element`: Interact with form elements (type, clear, select, focus, blur)
- `navigate-to-url`: Navigate tabs to specific URLs with optional load waiting
- `get-page-elements`: Find and list interactive elements on pages
- `inject-script`: Execute arbitrary JavaScript code in web pages
- `edit-page-content`: Modify page content (text or HTML) dynamically

## Installation

1. Install dependencies:
   ```bash
   bun install
   ```

2. Start the server:
   ```bash
   bun run dev
   ```

   Or for production:
   ```bash
   bun run src/index.ts
   ```

## Configuration

The server runs on the following ports by default:
- **WebSocket Server**: `ws://localhost:3000`
- **MCP Server**: Communicates via stdin/stdout

### Environment Variables

- `NODE_ENV`: Set to 'production' for production logging
- `WS_PORT`: WebSocket server port (default: 3000)

## Usage

### With MCP Clients

The server can be used with any MCP-compatible client:

```json
{
  "mcpServers": {
    "surf-mcp": {
      "command": "bun",
      "args": ["run", "/path/to/surf-mcp/mcp-server/src/index.ts"]
    }
  }
}
```

### With Browser Extension

1. Start the MCP server
2. Install and activate the Surf MCP browser extension
3. The extension will automatically connect to the WebSocket server
4. Use MCP tools to control the browser through the extension

## Development

### Scripts

- `bun run dev`: Start development server with file watching
- `bun run logs:debug`: Tail debug log file
- `bun run logs:error`: Tail error log file
- `bun run typecheck`: Run TypeScript type checking

### Adding New Tools

1. Create a new tool file in `src/tools/`
2. Define the tool using `ToolRegistry.createToolDefinition`
3. Register the tool in `src/mcp/server.ts`
4. Add corresponding protocol in the shared package
5. Implement the handler in the browser extension

### Logging

The server uses Winston for structured logging:
- Debug logs: `./logs/debug.log`
- Error logs: `./logs/error.log`
- Console output in development

## Architecture Details

### Protocol Flow

```
MCP Client → MCP Server → WebSocket Server → Browser Extension → Web Page
                ↓
         Tool Registry ← Request Handler ← WebSocket Client
```

### Tool Definition

Tools are defined with Zod schemas for type safety:

```typescript
export const exampleTool = ToolRegistry.createToolDefinition({
  name: "example-tool",
  description: "Tool description",
  schema: {
    param: z.string().describe("Parameter description"),
  },
  handler: async ({ param }, extra) => {
    // Tool implementation
  },
});
```

## Security Considerations

- The WebSocket server accepts connections from localhost only
- Browser extension requires explicit permissions for all URLs
- No authentication is implemented (intended for local development)
- All browser actions are logged for audit purposes

## Dependencies

- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **winston**: Structured logging
- **zod**: Runtime type validation
- **@surf-mcp/shared**: Shared types and protocols

## Contributing

1. Follow existing code patterns and conventions
2. Add comprehensive error handling
3. Include detailed logging for debugging
4. Update documentation for new features
5. Test with both MCP clients and browser extension
