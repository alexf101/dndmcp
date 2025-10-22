# DnDMCP Architecture v2

Type-safe, auto-documented API architecture using Hono, Zod, OpenAPI, and FastMCP.

## Quick Start

### Prerequisites
- Deno (for backend API)
- Node.js (for frontend)
- Python 3.9+ (for MCP bridge)

### Setup

```bash
# 1. Install Python dependencies (one-time setup)
deno task bridge:setup

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Generate OpenAPI specs from your API
deno run --allow-read --allow-write backend/src/generate-openapi.ts

# 4. Generate frontend API client
cd frontend && npm run generate:api && cd ..

# 5. Start the V2 API server (hybrid Hono+Oak) (in one terminal)
deno task dev:v2

# 6. Start the MCP bridge (in another terminal)
deno task bridge:py

# 7. Start the frontend (in a third terminal)
cd frontend && npm run dev
```

### Running Tests

```bash
# Test the type-safe API routes
deno task test:prototype
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  (React + Orval-generated types from openapi-full.json)     │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Hono API Server                           │
│  • Type-safe routes with Zod schemas                         │
│  • Routes tagged with "mcp" for MCP exposure                 │
│  • Exports openapi-full.json & openapi-mcp.json             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ OpenAPI spec
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Python FastMCP Bridge                      │
│  • Reads openapi-mcp.json (MCP-tagged routes only)          │
│  • Zero custom logic - pure passthrough                      │
│  • Exposes routes as MCP tools                               │
└─────────────────────────────────────────────────────────────┘
                          │ MCP Protocol
                          ▼
                   ┌──────────────┐
                   │ MCP Clients  │
                   │ (Claude, etc)│
                   └──────────────┘
```

## Key Components

### 1. Hono API Server (@hono/zod-openapi)

**Location**: `backend/src/api-prototype.ts` (example implementation)

Type-safe HTTP API with automatic OpenAPI spec generation:

```typescript
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

// Define request/response schemas with Zod
const RequestSchema = z.object({
  notation: z.string().openapi({
    example: "2d6+3",
    description: "Dice roll expression",
  }),
});

const ResponseSchema = z.object({
  total: z.number(),
  rolls: z.array(z.number()),
});

// Create route with MCP tag
const route = createRoute({
  method: "post",
  path: "/api/dice/roll",
  tags: ["dice", "mcp"],  // "mcp" tag = exposed via MCP
  request: {
    body: {
      content: {
        "application/json": { schema: RequestSchema },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: ResponseSchema },
      },
      description: "Success",
    },
  },
});

const app = new OpenAPIHono();
app.openapi(route, async (c) => {
  const body = c.req.valid("json");
  // Type-safe! body is fully typed from Zod schema
  return c.json({ total: 10, rolls: [4, 6] });
});
```

**Benefits:**
- Full TypeScript type safety from Zod schemas
- Automatic request/response validation
- Auto-generated OpenAPI documentation
- Export types for frontend use

### 2. OpenAPI Spec Generation

**Location**: `backend/src/generate-openapi.ts`

Generates two OpenAPI specifications:

- **`openapi-full.json`** - All API routes (for frontend/Orval)
- **`openapi-mcp.json`** - Only MCP-tagged routes (for MCP bridge)

**Filtering Logic**: `backend/src/filter-openapi-for-mcp.ts`

```typescript
export function filterOpenAPIForMCP(spec: OpenAPIObject): OpenAPIObject {
  // Filter to only include routes with "mcp" tag
  const filtered = { ...spec, paths: {} };
  
  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (operation.tags?.includes("mcp")) {
        filtered.paths[path] = pathItem;
      }
    }
  }
  
  return filtered;
}
```

### 3. Python FastMCP Bridge

**Location**: `mcp-bridge.py`

Minimal wrapper that exposes MCP-tagged routes as MCP tools:

```python
import json
import httpx
from fastmcp import FastMCP

def create_mcp_server():
    with open("backend/openapi-mcp.json", "r") as f:
        openapi_spec = json.load(f)
    
    client = httpx.AsyncClient(
        base_url="http://localhost:8000",
        timeout=30.0,
    )
    
    mcp = FastMCP.from_openapi(
        openapi_spec=openapi_spec,
        client=client,
        name="DnD Battle Manager",
    )
    
    return mcp

if __name__ == "__main__":
    mcp = create_mcp_server()
    mcp.run()
```

**Key Features:**
- Reads `openapi-mcp.json` at startup
- Automatically converts each OpenAPI route to an MCP tool
- Zero custom logic - pure HTTP passthrough
- FastMCP handles all MCP protocol details

### 4. Frontend Type Generation (Orval)

**Tool**: Orval  
**Config**: `orval.config.ts`  
**Generated Code**: `frontend/src/api/`

Generates TypeScript client code from `openapi-full.json`:

```bash
# Generate API client (run after updating OpenAPI spec)
cd frontend && npm run generate:api
```

**Generated files:**
- `frontend/src/api/dice/dice.ts` - Fully typed API functions
- `frontend/src/api/generated.schemas.ts` - TypeScript types

**Usage in React components:**

```typescript
import { postApiDiceRoll } from '../api/dice/dice';
import type { PostApiDiceRoll200 } from '../api/generated.schemas';

const response = await postApiDiceRoll({
  notation: "2d6+3",
  modifier: 0,
  description: "Attack roll",
});

if (response.status === 200) {
  // response.data is fully typed as PostApiDiceRoll200
  console.log(response.data.total);
}
```

See `frontend/src/components/TypeSafeDiceRoller.tsx` for a complete example.

## Design Principles

### 1. Single Source of Truth
- Zod schemas define both runtime validation and TypeScript types
- OpenAPI spec generated from these schemas
- Frontend types generated from OpenAPI spec
- Type safety flows: **Zod → OpenAPI → Frontend Types**

### 2. Zero Logic in Bridge
- MCP bridge has **no custom logic**
- All business logic lives in the main API server
- Bridge is a thin wrapper that reads OpenAPI and forwards HTTP
- New MCP endpoints = just tag routes with `"mcp"`, no bridge changes

### 3. Tag-Based MCP Exposure
- Use OpenAPI `tags: ["mcp"]` to mark routes for MCP exposure
- Clean separation between public API and MCP-only routes
- Easy to audit what's exposed via MCP

### 4. Gradual Migration
- Old and new systems can run in parallel
- Migrate route-by-route
- No big-bang rewrite required

## File Structure

```
backend/
├── src/
│   ├── main-v2.ts                 # Hybrid server (Hono + Oak)
│   ├── api-prototype.ts           # Hono+Zod routes
│   ├── api-prototype.test.ts      # Integration tests
│   ├── generate-openapi.ts        # OpenAPI spec generator
│   ├── filter-openapi-for-mcp.ts  # MCP filtering logic
│   ├── main.ts                    # Legacy Oak server
│   └── routes.ts                  # Legacy Oak routes
├── openapi-full.json              # Generated: all routes
└── openapi-mcp.json               # Generated: MCP routes only

mcp-bridge.py                      # Python FastMCP bridge
requirements.txt                   # Python dependencies
setup-mcp-bridge.sh                # Python setup script
```

## Running the Server

**V2 Server (recommended)** - Hybrid Hono + Oak:
```bash
deno task dev:v2    # Development with watch mode
deno task start:v2  # Production
```

**Legacy Server** - Oak only:
```bash
deno task dev       # Development
deno task start     # Production
```

## Development Workflow

### Adding a New API Route

1. **Define the route** in your Hono app with Zod schemas:
   ```typescript
   const myRoute = createRoute({
     method: "post",
     path: "/api/my-endpoint",
     tags: ["my-feature", "mcp"],  // Add "mcp" to expose via MCP
     request: { body: { content: { "application/json": { schema: MyRequestSchema } } } },
     responses: { 200: { content: { "application/json": { schema: MyResponseSchema } } } },
   });
   
   app.openapi(myRoute, async (c) => {
     const body = c.req.valid("json");
     // Implementation
     return c.json({ ... });
   });
   ```

2. **Regenerate OpenAPI specs**:
   ```bash
   deno run --allow-read --allow-write backend/src/generate-openapi.ts
   ```

3. **Regenerate frontend types**:
   ```bash
   cd frontend && npm run generate:api
   ```

4. **Restart the MCP bridge** (it reads the spec at startup):
   ```bash
   deno task bridge:py
   ```

5. **Test** the new endpoint:
   - HTTP: `curl http://localhost:8000/api/my-endpoint`
   - Frontend: Import and use the generated function
   - MCP: Use Claude or another MCP client

### Testing

```bash
# Run Hono API tests
deno task test:prototype

# Run full integration tests
deno task test
```

## Benefits of This Architecture

### ✅ Type Safety End-to-End
- Backend: Zod schemas enforce types at runtime
- Frontend: Generated types match backend exactly
- No manual type sync required

### ✅ Auto-Generated Documentation
- OpenAPI spec is always up-to-date
- Can serve Swagger UI for interactive docs
- MCP tools auto-documented from route descriptions

### ✅ Single Definition for Multiple Uses
- Same route definition serves:
  - HTTP API (for frontend)
  - MCP tools (for AI clients)
  - API documentation (OpenAPI/Swagger)

### ✅ Minimal MCP Maintenance
- MCP bridge is ~30 lines
- No custom MCP tool definitions
- Just tag routes with `"mcp"` - bridge does the rest

### ✅ Validation at the Edge
- Zod validates all requests automatically
- Clear error messages for invalid data
- Type-safe handlers guaranteed valid input

## Migration Strategy

### Phase 1: Parallel Systems ✅ Current
- New Hono routes alongside existing Oak routes
- Both MCP bridges can run simultaneously
- Test new architecture with low-risk endpoints

### Phase 2: Route-by-Route Migration
- Migrate existing routes to Hono+Zod
- Update frontend to use generated types
- Switch MCP bridge when majority migrated

### Phase 3: Cleanup
- Remove old Oak routes
- Remove old Deno MCP bridge
- Single unified architecture

## Troubleshooting

### MCP bridge fails to start
```bash
# Regenerate OpenAPI specs
deno run --allow-read --allow-write backend/src/generate-openapi.ts

# Check that openapi-mcp.json exists and has required fields
cat backend/openapi-mcp.json | jq '.info'
```

### Types don't match between frontend/backend
```bash
# Regenerate everything
deno run --allow-read --allow-write backend/src/generate-openapi.ts
# Then regenerate frontend types with Orval (when set up)
```

### Python virtual environment issues
```bash
# Clean and recreate
rm -rf venv
deno task bridge:setup
```

## Resources

- [Hono Documentation](https://hono.dev/)
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- [FastMCP](https://gofastmcp.com/)
- [Orval](https://orval.dev/)
- [Zod](https://zod.dev/)
