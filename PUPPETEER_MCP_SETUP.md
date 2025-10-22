# Puppeteer MCP Integration Setup

This document describes how to use the Puppeteer MCP server for UI testing and feedback.

## What is it?

The Puppeteer MCP server provides browser automation capabilities via the Model Context Protocol. This allows AI agents to:
- Navigate to web pages
- Take screenshots
- Click elements
- Type into forms
- Extract page content
- Execute JavaScript
- Wait for elements to load

## Installation

The Puppeteer MCP server is already created at `mcp-puppeteer.ts`. To use it:

### 1. Add to Claude Desktop Configuration

Add this to your Claude Desktop MCP settings (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "dnd-puppeteer": {
      "command": "deno",
      "args": [
        "run",
        "--allow-all",
        "/Users/alexfinkel/git/dndmcp/mcp-puppeteer.ts"
      ]
    }
  }
}
```

### 2. Restart Claude Desktop

After adding the configuration, restart Claude Desktop to load the new MCP server.

## Available Tools

### `puppeteer_navigate`
Navigate to a URL and wait for page load.
```json
{
  "url": "http://localhost:5173"
}
```

### `puppeteer_screenshot`
Take a screenshot of the current page or a specific element.
```json
{
  "selector": ".battle-grid",  // optional
  "fullPage": true              // optional
}
```

### `puppeteer_click`
Click an element on the page.
```json
{
  "selector": "button.start-battle"
}
```

### `puppeteer_type`
Type text into an input field.
```json
{
  "selector": "input[name='creature-name']",
  "text": "Goblin"
}
```

### `puppeteer_get_content`
Get the text content or HTML of the page or element.
```json
{
  "selector": ".battle-status",  // optional
  "html": false                   // optional
}
```

### `puppeteer_evaluate`
Execute JavaScript in the browser context.
```json
{
  "script": "document.querySelector('.hp-value').textContent"
}
```

### `puppeteer_wait_for_selector`
Wait for an element to appear on the page.
```json
{
  "selector": ".loading-complete",
  "timeout": 30000  // optional, default 30000ms
}
```

### `puppeteer_get_elements`
Get information about elements matching a selector.
```json
{
  "selector": ".creature-card"
}
```

### `puppeteer_close`
Close the browser.
```json
{}
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

## Notes

- The browser launches in **non-headless mode** so you can see what the agent is doing
- Screenshots are returned as base64-encoded PNG images
- The browser stays open between requests for faster operations
- Use `puppeteer_close` to close the browser when done
