import { createPrototypeAPI } from "./api-prototype.ts";
import { filterOpenAPIForMCP } from "./filter-openapi-for-mcp.ts";

const app = createPrototypeAPI();

const openAPIDoc = app.getOpenAPI31Document({
  openapi: "3.1.0",
  info: {
    title: "D&D Battle Manager API",
    version: "1.0.0",
    description: "Type-safe API for D&D 5e battle management",
  },
  servers: [
    {
      url: "http://localhost:8000",
      description: "Local development server",
    },
  ],
});
const mcpFilteredDoc = filterOpenAPIForMCP(openAPIDoc);

Deno.writeTextFileSync("backend/openapi-full.json", JSON.stringify(openAPIDoc, null, 2));
Deno.writeTextFileSync("backend/openapi-mcp.json", JSON.stringify(mcpFilteredDoc, null, 2));

console.log("Generated OpenAPI specs:");
console.log("- backend/openapi-full.json (all routes)");
console.log("- backend/openapi-mcp.json (MCP routes only)");
