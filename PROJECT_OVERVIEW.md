# D&D 5e Battle State Server with MCP Integration

## Project Overview

This project creates a modern TypeScript-based server system for managing D&D 5th edition battle states with AI integration through Model Context Protocol (MCP). The battle server is intentionally simple - it stores and manages battle state without enforcing D&D rules, relying on external sources for game knowledge.

## Architecture

### Backend (Deno + TypeScript)
- **Battle State Server**: RESTful API for managing combat encounters (state-only, no D&D rule enforcement)
- **JSON Interface**: Simple, well-documented endpoints for all battle operations
- **Undo/Redo System**: Clean action rollback for invalid moves
- **MCP Server**: Integration layer for AI conversation and commands
- **Data Models**: Generic battle state representations (no hardcoded D&D knowledge)

### Frontend (React + TypeScript)
- **Battle Viewer**: Real-time display of combat state
- **Initiative Tracker**: Turn order and combat flow management
- **Character/Monster Cards**: Health, stats, and status effects
- **Combat Log**: History of actions and events

### Key Features
- **Real-time Updates**: WebSocket connection for live battle state sync
- **AI Integration**: Natural language commands through MCP
  - Query battle state ("What's everyone's remaining HP?")
  - Issue commands ("Have the kobolds attack the nearest PC")
  - Confirmation workflows for complex actions
- **Undo/Redo System**: Rollback invalid or unwanted actions
- **External D&D Knowledge**: AI uses Open5e API for rules and monster data
- **Simple State Management**: Server stores state without rule enforcement
- **Action Validation Flags**: Server can flag potentially invalid actions (but executes them)
- **Modern Stack**: Deno runtime, TypeScript throughout, modern build tools

## Design Philosophy

### Separation of Concerns
- **Battle Server**: Pure state management, no game rule knowledge
- **AI Agent**: Game knowledge via Open5e API integration
- **Client**: Display and interaction, trusts server state
- **MCP Layer**: Natural language to API command translation

### State vs Rules
The battle server accepts any valid JSON commands and maintains consistent state, but doesn't know D&D rules. This allows:
- Flexibility for house rules or other game systems
- Simplified server logic focused on state management  
- AI agent handles rule validation via external APIs
- Clean separation between "what happened" and "what should happen"

## Technology Stack

- **Backend**: Deno 2.x, TypeScript, Oak (web framework)
- **Frontend**: React 18, TypeScript, Vite (build tool)
- **Communication**: WebSockets, REST API, MCP Protocol
- **Data**: In-memory state (with JSON persistence option)
- **Testing**: Deno's built-in test runner, React Testing Library

## Development Principles

- **AI-Friendly**: Clear documentation, consistent naming, type safety
- **Simple JSON Interface**: Easy to understand and integrate
- **Modular Design**: Separate concerns, testable components
- **Type Safety**: Full TypeScript coverage, no `any` types
- **Modern Practices**: ESM modules, async/await, functional patterns