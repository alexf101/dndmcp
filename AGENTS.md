# AI Agent Guidelines for DndMCP

## Task Management

This project uses **beads** (`bd`) for persistent task tracking and project management.

- **Issue Tracker**: Database located at `.beads/dndmcp.db`
- **Issue Prefix**: `dndmcp-N`
- **JSON Output**: All `bd` commands support `--json` flag for programmatic use

### Common Commands

```bash
# Find ready work (no blockers)
bd ready --json

# Create a new issue
bd create "Task title" -t task -p 2 --json

# Update issue status
bd update <issue-id> --status in_progress --json

# Close an issue
bd close <issue-id> --reason "Completed" --json

# List all issues
bd list --json

# Show issue details
bd show <issue-id> --json

# Add dependencies
bd dep add <dependent-id> <blocking-id> --type blocks
```

### Workflow

- Use `bd ready --json` to find actionable tasks
- Create issues for newly discovered work or bugs
- Track dependencies for complex multi-step tasks
- Close issues with descriptive reasons when complete

## Project Structure

### Development Commands

```bash
# Start frontend dev server
npm run dev

# Start backend server
npm run backend

# Build frontend
npm run build

# Run backend tests
npm run test
```

### Puppeteer MCP for UI Testing

The project uses the open source [puppeteer-mcp-server](https://github.com/merajmehrabi/puppeteer-mcp-server) for automated browser testing and UI feedback. See [PUPPETEER_MCP_SETUP.md](./PUPPETEER_MCP_SETUP.md) for setup and usage.

It's already configured in Claude Desktop via npx:

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
