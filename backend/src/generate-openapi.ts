import { createPrototypeAPI } from "./api-prototype.ts";
import { createBattleAPI } from "./api-battle.ts";
import { BattleStore } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";
import { filterOpenAPIForMCP } from "./filter-openapi-for-mcp.ts";

// Create mock stores for OpenAPI generation
const campaignStore = new CampaignStore();
const battleStore = new BattleStore(campaignStore);

// Create Hono apps
const prototypeApp = createPrototypeAPI();
const battleApp = createBattleAPI(battleStore, campaignStore);

// Mount battle routes onto main app
prototypeApp.route("/", battleApp);

const openAPIDoc = prototypeApp.getOpenAPI31Document({
  openapi: "3.1.0",
  info: {
    title: "D&D Battle Manager API",
    version: "1.0.0",
    description: "Type-safe API for D&D 5e battle management with MCP support",
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
