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

(Add project-specific build, test, and development commands here as needed)
