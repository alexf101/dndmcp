/**
 * Unified D&D Battle Manager Server
 * Runs both REST API and MCP HTTP server in single process with shared state
 */

import { Application, Router } from "@oak/oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { BattleStore } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";
import { DiceStore } from "./dice-store.ts";
import { generateRoutes } from "./route-generator.ts";
import { createMCPHttpHandler } from "./mcp-http-handler.ts";
import { sseManager } from "./sse-manager.ts";
import { logger } from "./logger.ts";

const REST_PORT = Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : 8000;
const MCP_PORT = Deno.env.get("MCP_PORT") ? Number(Deno.env.get("MCP_PORT")) : 8001;

// Create shared stores (single instances for both APIs)
logger.info("🎲 Initializing shared game state stores...");
const campaignStore = new CampaignStore();
const battleStore = new BattleStore(campaignStore);
const diceStore = new DiceStore();

// Register SSE emitter for dice rolls
diceStore.registerSSEEmitter((roll) => {
    sseManager.broadcastDiceRoll(roll);
});

logger.info("✅ Shared stores initialized");

// Create REST API application (port 8000)
const restApp = new Application();

restApp.use(
    oakCors({
        origin: "http://localhost:5173",
    }),
);

const restRouter = generateRoutes(battleStore, campaignStore, diceStore);
restApp.use(restRouter.routes());
restApp.use(restRouter.allowedMethods());

restApp.addEventListener("listen", ({ hostname, port, secure }) => {
    logger.info(
        `🗡️  REST API running on ${secure ? "https" : "http"}://${
            hostname ?? "localhost"
        }:${port}`,
    );
});

// Create MCP HTTP application (port 8001)
const mcpApp = new Application();

mcpApp.use(
    oakCors({
        origin: "*", // MCP clients may come from various sources
    }),
);

const mcpRouter = new Router();
const mcpHandler = createMCPHttpHandler(battleStore, campaignStore, diceStore);
mcpRouter.post("/mcp", mcpHandler);
mcpRouter.post("/", mcpHandler); // Also accept at root for flexibility

mcpApp.use(mcpRouter.routes());
mcpApp.use(mcpRouter.allowedMethods());

mcpApp.addEventListener("listen", ({ hostname, port, secure }) => {
    logger.info(
        `🤖 MCP Server running on ${secure ? "https" : "http"}://${
            hostname ?? "localhost"
        }:${port}/mcp`,
    );
});

// Start both servers
logger.info("🚀 Starting unified server...");
logger.info("   REST API will be on port", REST_PORT);
logger.info("   MCP HTTP will be on port", MCP_PORT);
logger.info("");
logger.info("💡 To use with Claude Desktop, add this to your config:");
logger.info('   "url": "http://localhost:8001/mcp"');
logger.info("");

// Start REST API
const restPromise = restApp.listen({ port: REST_PORT });

// Start MCP server
const mcpPromise = mcpApp.listen({ port: MCP_PORT });

// Wait for both servers
await Promise.all([restPromise, mcpPromise]);
