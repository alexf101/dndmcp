# D&D 5e Battle State Server with MCP Integration

A modern TypeScript-based server system for managing D&D 5th edition battle states with AI integration through Model Context Protocol (MCP).

## Overview

This project creates a battle state management system that separates state storage from game rules. The battle server manages combat encounters without enforcing D&D rules, relying on external sources (like Open5e API) for game knowledge through AI integration.

## Architecture

-   **Unified Server**: Single Deno process running both REST API (port 8000) and MCP HTTP server (port 8001) with shared in-memory state
-   **Frontend**: React + TypeScript for real-time battle visualization
-   **MCP Integration**: AI-powered natural language commands through HTTP transport
-   **Real-time Sync**: Changes from MCP instantly appear in frontend via Server-Sent Events

## Prerequisites

-   [Deno](https://deno.land/) (latest version)

    brew install deno

-   [Node.js](https://nodejs.org/) (18+ recommended)

    brew install nvm
    nvm install 18

-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

    brew install yarn

## Getting Started

### Initial Setup

1. Install dependencies:

    ```bash
    deno install
    ```

### Unified Server (Backend + MCP)

Start the unified server (recommended - runs both REST and MCP):

```bash
deno task dev
```

Or for production:

```bash
deno task start
```

This starts:
- **REST API** on `http://localhost:8000`
- **MCP HTTP Server** on `http://localhost:8001/mcp`

Both share the same in-memory state, enabling instant real-time updates!

### Backend tests

We have integration tests for the major API endpoints. Run them as:

```bash
deno task test
```

### Frontend (React App)

1. Navigate to the frontend directory:

    ```bash
    cd frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the development server:
    ```bash
    npm run dev
    ```

The frontend will be available at `http://localhost:5173` (default Vite port).

### MCP Server (AI Integration)

Transform Claude into your personal **D&D Dungeon Master Assistant**! The MCP server enables natural language battle management through Claude Desktop.

#### Quick Setup for Claude Desktop (HTTP Transport)

1. **Start the unified server**: `deno task dev`

2. **Add to your Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
    ```json
    {
      "mcpServers": {
        "dnd-battle-manager": {
          "url": "http://localhost:8001/mcp"
        }
      }
    }
    ```

3. **Restart Claude Desktop** and you're ready!

4. **Copy the AI prompt**: Open [MCP_AGENT_PROMPT.md](MCP_AGENT_PROMPT.md) and paste its contents into your first message to Claude to initialize it as a D&D assistant.

**Benefits of HTTP Transport:**
- ✅ Real-time sync between Claude and frontend
- ✅ Shared state - changes appear instantly
- ✅ No separate MCP process needed

#### Using the MCP Server

Once configured, talk to Claude naturally about D&D:

- **"Create a forest goblin ambush encounter for 4 players"**
- **"The rogue attacks the goblin for 6 damage"**
- **"Roll initiative and move to the next turn"**
- **"Save this goblin as a campaign creature template"**

Claude will automatically use the MCP tools to manage your battle state!

#### Standalone MCP Server

You can also run the MCP server standalone (without Claude Desktop):

```bash
deno task mcp
```

### Full Development Setup

To run the complete system:

1. **Terminal 1** - Start the unified server (REST + MCP):

    ```bash
    deno task dev
    ```

2. **Terminal 2** - Start the frontend:
    ```bash
    cd frontend && npm install && npm run dev
    ```

**That's it!** Changes from Claude Desktop will instantly appear in the frontend at `http://localhost:5173`

#### Alternative: Standalone Servers

If you need to run servers separately:

```bash
# Legacy standalone MCP server (stdio transport)
deno task mcp

# REST-only backend
deno task backend:dev
```

**Note:** Standalone servers don't share state - use unified server for real-time sync.

## Available Scripts

### Deno Tasks (run from project root)

**Recommended:**
-   `deno task dev` - Start unified server (REST + MCP) with hot-reloading
-   `deno task start` - Start unified server in production mode

**Legacy/Testing:**
-   `deno task backend:dev` - Start REST-only backend with hot-reloading
-   `deno task backend` - Start REST-only backend in production mode
-   `deno task mcp` - Run standalone MCP server (stdio transport)
-   `deno task test` - Run backend API endpoint tests
-   `deno task test:mcp` - Run MCP integration tests

### Frontend (React)

-   `npm run dev` - Start development server
-   `npm run build` - Build for production
-   `npm run preview` - Preview production build
-   `npm run lint` - Run ESLint

## API Endpoints

The backend provides RESTful endpoints for battle state management:

### Battle Management
-   `GET /api/battles` - List all battles
-   `POST /api/battles` - Create new battle
-   `GET /api/battles/:id` - Get battle details
-   `POST /api/battles/:id/command` - Execute battle command

### Dice Rolling
-   `POST /api/dice/roll` - Roll dice using D&D notation
-   `GET /api/dice/rolls` - Get dice roll history

### Campaign Management
-   `GET /api/campaigns` - List all campaigns
-   `POST /api/campaigns` - Create new campaign
-   `GET /api/campaigns/:id/creatures` - Search campaign creatures

### Real-time Updates
-   `GET /api/events` - SSE endpoint for live battle and dice updates

## Features

-   **Real-time Battle State**: Live updates via Server-Sent Events (SSE)
-   **Dice Rolling**: D&D 5e notation support (d4, d6, d8, d10, d12, d20, d100, advantage/disadvantage)
-   **Persistent History**: Battle states and dice rolls saved to file
-   **Undo/Redo System**: Action rollback for invalid moves
-   **AI Integration**: Natural language commands through Model Context Protocol (MCP)
-   **Initiative Tracking**: Automatic turn order and combat flow management
-   **Character Management**: Health, stats, status effects, and positioning
-   **Campaign System**: Reusable creature templates and maps
-   **Grid & Theatre of Mind**: Support for both tactical and narrative combat modes

## Development

This project uses modern TypeScript throughout with strict type checking enabled. The backend uses Deno's built-in tooling, while the frontend uses Vite for fast development builds.

## License

See [LICENSE](LICENSE) file for details.
