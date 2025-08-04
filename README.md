# Surf MCP

A comprehensive browser automation system built on the Model Context Protocol (MCP). Surf MCP enables AI assistants to interact with web browsers through a type-safe, protocol-driven architecture consisting of an MCP server, browser extension, and shared communication layer.

## Overview

Surf MCP bridges the gap between AI assistants and web browsers by providing:

- **MCP Server**: Exposes browser automation tools through the Model Context Protocol
- **Browser Extension**: Executes browser automation commands in real-time
- **Shared Library**: Type-safe communication protocols and utilities
- **Comprehensive API**: Tools for tab management, page interaction, content extraction, and more

## Architecture

```
AI Assistant → MCP Client → MCP Server → WebSocket → Browser Extension → Web Browser
                                           ↓
                                    Shared Protocols
```

The system consists of three main packages:

- **`extension/`**: Browser extension that performs web automation
- **`mcp-server/`**: MCP server that exposes browser tools to AI assistants
- **`shared/`**: Common types, protocols, and utilities

## Features

### Browser Automation Tools

- **Tab Management**: Open, close, navigate, and manage browser tabs
- **Element Interaction**: Click buttons, fill forms, interact with page elements
- **Content Extraction**: Get page text, find links, extract structured data
- **Page Navigation**: Navigate to URLs with load waiting and redirect handling
- **Script Injection**: Execute custom JavaScript in web pages
- **Content Editing**: Dynamically modify page content (text or HTML)
- **Element Discovery**: Find and list interactive elements on pages

### Technical Features

- **Type Safety**: Full TypeScript support with runtime validation
- **Protocol-Driven**: Structured communication via WebSocket protocols
- **Real-time**: Immediate browser response through WebSocket connections
- **Error Handling**: Comprehensive error reporting and recovery
- **Logging**: Structured logging for debugging and monitoring
- **Cross-Browser**: Support for Chrome and Firefox browsers

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- Modern web browser (Chrome or Firefox)
- AI assistant with MCP support (e.g., Claude Desktop)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd surf-mcp
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the MCP server:
   ```bash
   cd mcp-server
   bun run dev
   ```

4. Build and install the browser extension:
   ```bash
   cd extension
   bun run build
   ```
   
   Load the extension in your browser:
   - Chrome: `chrome://extensions` → Load unpacked → Select `.output/chrome-mv3`
   - Firefox: `about:debugging` → Load Temporary Add-on → Select manifest in `.output/firefox-mv2`

5. Configure your MCP client to use the server:
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

## Usage

Once configured, you can use browser automation tools in your AI assistant:

```
"Please open a new tab and navigate to example.com, then click the 'Get Started' button"
```

The AI assistant will use the MCP tools to:
1. Open a new browser tab
2. Navigate to the specified URL
3. Find and click the target element

## Available Tools

### Tab Management
- `open-tab`: Create new browser tabs
- `close-tab`: Close existing tabs
- `get-active-tab`: Get active tab information
- `get-tabs`: List all open tabs
- `get-tab-content`: Extract page content and links

### Page Interaction
- `click-element`: Click elements using CSS selectors
- `interact-element`: Type text, clear inputs, select options, focus/blur elements
- `navigate-to-url`: Navigate to URLs with optional load waiting
- `get-page-elements`: Find interactive elements on pages
- `inject-script`: Execute JavaScript in web pages
- `edit-page-content`: Modify page content dynamically

## Development

### Workspace Structure

This is a Bun workspace with three packages:

```
surf-mcp/
├── extension/          # Browser extension
├── mcp-server/         # MCP server
├── shared/             # Shared utilities and protocols
└── package.json        # Workspace configuration
```

### Scripts

- `bun run typecheck`: Type check all packages

### Package-Specific Development

Each package has its own README with detailed development instructions:

- [Extension README](./extension/README.md)
- [MCP Server README](./mcp-server/README.md)  
- [Shared Library README](./shared/README.md)

### Adding New Tools

1. Define the protocol in `shared/src/protocols/browser.ts`
2. Register the protocol in `shared/src/protocol.ts`
3. Implement the MCP tool in `mcp-server/src/tools/`
4. Add the WebSocket handler in `extension/entrypoints/background/ws-client.ts`
5. Register both in their respective server files

## Security Considerations

- The browser extension requires broad permissions for automation
- WebSocket communication is unencrypted (localhost only)
- No authentication is implemented (intended for local development)
- All browser actions are logged for audit purposes
- Should only be used in trusted environments

## Contributing

1. Follow existing code patterns and TypeScript conventions
2. Maintain type safety throughout all changes
3. Add comprehensive error handling and logging
4. Update documentation for new features
5. Test with both MCP clients and browser extension
6. Follow conventional commit format for commit messages

## License

[Add your license information here]

## Support

For issues and questions:
- Check the individual package READMEs
- Review the logs in `mcp-server/logs/` and browser console
- Ensure the WebSocket connection is established between components