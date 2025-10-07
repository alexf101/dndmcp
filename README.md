# D&D 5e Battle State Server with MCP Integration

A modern TypeScript-based server system for managing D&D 5th edition battle states with AI integration through Model Context Protocol (MCP).

## Overview

This project creates a battle state management system that separates state storage from game rules. The battle server manages combat encounters without enforcing D&D rules, relying on external sources (like Open5e API) for game knowledge through AI integration.

## Architecture

-   **Backend**: Deno + TypeScript REST API for battle state management
-   **Frontend**: React + TypeScript for real-time battle visualization
-   **MCP Integration**: AI-powered natural language commands for battle management

## Prerequisites

-   [Deno](https://deno.land/) (latest version)

    brew install deno

-   [Node.js](https://nodejs.org/) (18+ recommended)

    brew install nvm
    nvm install 18

-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

    brew install yarn

## Getting Started

### Backend (Deno Server)

1. Navigate to the backend directory:

    ```bash
    cd backend
    ```

2. Start the development server:

    ```bash
    deno task dev
    ```

    Or for production:

    ```bash
    deno task start
    ```

The backend server will start on `http://localhost:8000` (or configured port).

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

### Full Development Setup

To run both backend and frontend simultaneously:

1. **Terminal 1** - Start the backend:

    ```bash
    cd backend && deno task dev
    ```

2. **Terminal 2** - Start the frontend:
    ```bash
    cd frontend && npm install && npm run dev
    ```

## Available Scripts

### Backend (Deno)

-   `deno task dev` - Start development server with file watching
-   `deno task start` - Start production server

### Frontend (React)

-   `npm run dev` - Start development server
-   `npm run build` - Build for production
-   `npm run preview` - Preview production build
-   `npm run lint` - Run ESLint

## API Endpoints

The backend provides RESTful endpoints for battle state management:

-   `GET /api/battles` - List all battles
-   `POST /api/battles` - Create new battle
-   `GET /api/battles/:id` - Get battle details
-   `PUT /api/battles/:id` - Update battle state
-   `DELETE /api/battles/:id` - Delete battle

## Project Structure

```
├── backend/          # Deno backend server
│   ├── src/
│   │   ├── main.ts          # Server entry point
│   │   ├── routes.ts        # API routes
│   │   ├── types.ts         # TypeScript types
│   │   └── battle-store.ts  # Battle state management
│   └── deno.json     # Deno configuration
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.tsx         # Main app component
│   │   └── api.ts          # API client
│   └── package.json  # Node.js dependencies
└── docs/            # Project documentation
```

## Features

-   **Real-time Battle State**: Live updates and synchronization
-   **Undo/Redo System**: Action rollback for invalid moves
-   **AI Integration**: Natural language commands through MCP
-   **Initiative Tracking**: Turn order and combat flow management
-   **Character Management**: Health, stats, and status effects
-   **Combat Logging**: History of actions and events

## Development

This project uses modern TypeScript throughout with strict type checking enabled. The backend uses Deno's built-in tooling, while the frontend uses Vite for fast development builds.

## License

See [LICENSE](LICENSE) file for details.
