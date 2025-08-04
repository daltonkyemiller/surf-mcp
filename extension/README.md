# Surf MCP Browser Extension

A browser extension that enables comprehensive web automation through the Model Context Protocol (MCP). This extension acts as a bridge between MCP servers and web browsers, providing tools for clicking elements, filling forms, navigating pages, and extracting content.

## Features

- **Tab Management**: Open, close, and navigate between browser tabs
- **Element Interaction**: Click buttons, fill forms, and interact with page elements
- **Page Navigation**: Navigate to URLs and wait for page loads
- **Content Extraction**: Get page content and find interactive elements
- **Script Injection**: Execute custom JavaScript in web pages
- **Content Editing**: Modify page content dynamically

## Architecture

The extension consists of:

- **Background Script**: WebSocket client that communicates with the MCP server
- **Content Scripts**: Injected functions for page interaction
- **Popup Interface**: React-based UI for extension management

## Installation

### Development

1. Install dependencies:
   ```bash
   bun install
   ```

2. Start development server:
   ```bash
   bun run dev
   ```

3. Load the extension in your browser:
   - Chrome: Go to `chrome://extensions`, enable Developer mode, click "Load unpacked", select the `.output/chrome-mv3` directory
   - Firefox: Go to `about:debugging`, click "This Firefox", click "Load Temporary Add-on", select the manifest file in `.output/firefox-mv2`

### Production Build

1. Build the extension:
   ```bash
   bun run build
   ```

2. Create distribution package:
   ```bash
   bun run zip
   ```

## Configuration

The extension connects to the MCP server via WebSocket on `ws://localhost:3000` by default. This can be configured in the background script.

## Permissions

The extension requires the following permissions:
- `storage`: Store extension settings
- `tabs`: Manage browser tabs
- `tabCapture`: Capture tab information
- `activeTab`: Access active tab content
- `nativeMessaging`: Communicate with native applications
- `scripting`: Inject scripts into web pages
- `<all_urls>`: Access all websites for automation

## API

The extension exposes the following browser automation capabilities through MCP tools:

### Tab Management
- `open-tab`: Create new browser tabs
- `close-tab`: Close existing tabs
- `get-active-tab`: Get information about the currently active tab
- `get-tabs`: List all open tabs
- `get-tab-content`: Extract text content and links from a tab

### Page Interaction
- `click-element`: Click on page elements using CSS selectors
- `interact-element`: Type text, clear inputs, select options, focus/blur elements
- `navigate-to-url`: Navigate tabs to specific URLs
- `get-page-elements`: Find interactive elements on the page
- `inject-script`: Execute custom JavaScript code
- `edit-page-content`: Modify page content (text or HTML)

## Development

### Scripts

- `bun run dev`: Start development server with hot reload
- `bun run dev:firefox`: Start development server for Firefox
- `bun run build`: Build production version
- `bun run build:firefox`: Build for Firefox
- `bun run zip`: Create distribution packages
- `bun run typecheck`: Run TypeScript type checking

### Technology Stack

- **WXT**: Web extension framework
- **React**: UI framework for popup
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Styling
- **WebSocket**: Real-time communication with MCP server

## Security Considerations

This extension has broad permissions and can interact with all websites. It should only be used in trusted environments and with trusted MCP servers. The WebSocket connection is unencrypted and intended for local development use.

## Contributing

1. Follow the existing code style and patterns
2. Add appropriate error handling
3. Test all browser automation features
4. Update documentation for new features
