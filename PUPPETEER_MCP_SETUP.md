# Puppeteer MCP Integration Setup

This document describes how to use the Puppeteer MCP server for UI testing and feedback.

## What is it?

We're using the [merajmehrabi/puppeteer-mcp-server](https://github.com/merajmehrabi/puppeteer-mcp-server) open source MCP server, which provides browser automation capabilities via the Model Context Protocol. This allows AI agents to:
- Navigate to web pages
- Take screenshots
- Click elements
- Fill forms and select dropdowns
- Extract page content
- Execute JavaScript
- Connect to existing Chrome tabs
- Hover over elements

## Installation

We're using the open source puppeteer-mcp-server via npx. It's already configured in your Claude Desktop settings.

### Configuration

The server is configured in `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
"mcpServers": {
"puppeteer": {
"command": "npx",
"args": ["-y", "puppeteer-mcp-server"]
}
}
}
```

### Restart Claude Desktop

Restart Claude Desktop to ensure the configuration is loaded.

## Available Tools

### `puppeteer_connect_active_tab`
Connect to an existing Chrome instance with remote debugging enabled.
```json
{
"targetUrl": "https://example.com",  // optional: specific tab URL
  "debugPort": 9222                      // optional: defaults to 9222
}
```

### `puppeteer_navigate`
Navigate to a URL.
```json
{
"url": "http://localhost:5173"
}
```

### `puppeteer_screenshot`
Take a screenshot of the current page or a specific element.
```json
{
"name": "homepage",
  "selector": ".battle-grid",  // optional
  "width": 800,                 // optional
  "height": 600                 // optional
}
```

### `puppeteer_click`
Click an element on the page.
```json
{
  "selector": "button.start-battle"
}
```

### `puppeteer_fill`
Fill out an input field.
```json
{
  "selector": "input[name='creature-name']",
  "value": "Goblin"
}
```

### `puppeteer_select`
Use dropdown menus.
```json
{
  "selector": "select.creature-type",
  "value": "goblin"
}
```

### `puppeteer_hover`
Hover over elements.
```json
{
  "selector": ".creature-card"
}
```

### `puppeteer_evaluate`
Execute JavaScript in the browser console.
```json
{
  "script": "document.querySelector('.hp-value').textContent"
}
```

## Usage Examples

### Test the Frontend

1. Start the frontend dev server:
```bash
npm run dev
```

2. Ask the AI agent:
```
Navigate to http://localhost:5173 and take a screenshot
```

### Debug UI Issues

```
Navigate to the battle page, click the "Start Battle" button, 
wait for the initiative tracker to appear, and screenshot it
```

### Extract UI State

```
Get the content of all creature cards on the battle page
```

### Run UI Tests

```
Navigate to the app, create a new battle, add a creature, 
and verify it appears in the creature list
```

## Usage Modes

### Standard Mode
The server launches a new browser instance by default.

### Active Tab Mode
To connect to an existing Chrome window:
1. Close any existing Chrome instances completely
2. Launch Chrome with remote debugging: `google-chrome --remote-debugging-port=9222`
3. Navigate to your desired webpage
4. Use `puppeteer_connect_active_tab` to connect

## Notes

- By default launches in headless mode (configurable via environment variables)
- Screenshots are returned as base64-encoded PNG images
- Supports connecting to existing Chrome tabs for better workflow integration
- Includes comprehensive logging and error handling
