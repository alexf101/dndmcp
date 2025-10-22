/**
 * V2 D&D Battle Manager Server
 * Integrates Hono (new type-safe routes) with Oak (legacy routes)
 */

// Using Deno.serve (built-in)
import { Application } from "@oak/oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { BattleStore } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";
import { DiceStore } from "./dice-store.ts";
import { generateRoutes } from "./route-generator.ts";
import { sseManager } from "./sse-manager.ts";
import { createPrototypeAPI } from "./api-prototype.ts";
import { createBattleAPI } from "./api-battle.ts";
import { createCampaignAPI } from "./api-campaign.ts";

const PORT = Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : 8000;

// Create shared stores
console.log("🎲 Initializing shared game state stores...");
const campaignStore = new CampaignStore();
const battleStore = new BattleStore(campaignStore);
const diceStore = new DiceStore();

// Register SSE emitter for dice rolls
diceStore.registerSSEEmitter((roll) => {
    sseManager.broadcastDiceRoll(roll);
});

console.log("✅ Shared stores initialized");

// Create Hono app (new type-safe routes)
const honoApp = createPrototypeAPI();

// Add CORS middleware to Hono app
honoApp.use(
    "*",
    cors({
        origin: "http://localhost:5173",
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type"],
        credentials: true,
    })
);

const battleApp = createBattleAPI(battleStore, campaignStore);
const campaignApp = createCampaignAPI(campaignStore);

// Mount battle and campaign routes under the main Hono app
honoApp.route("/", battleApp);
honoApp.route("/", campaignApp);

// Serve OpenAPI spec as JSON endpoint
honoApp.get("/api/openapi.json", (c) => {
    return c.json(
        honoApp.getOpenAPIDocument({
            openapi: "3.1.0",
            info: {
                title: "D&D Battle Manager API",
                version: "1.0.0",
                description:
                    "Type-safe API for D&D 5e battle management with MCP support",
            },
            servers: [
                {
                    url: "http://localhost:8000",
                    description: "Local development server",
                },
            ],
        })
    );
});

// Create Oak app (legacy routes)
const oakApp = new Application();
oakApp.use(oakCors({ origin: "http://localhost:5173" }));
const oakRouter = generateRoutes(battleStore, campaignStore, diceStore);
oakApp.use(oakRouter.routes());
oakApp.use(oakRouter.allowedMethods());

// Create a unified handler that tries Hono first, then falls back to Oak
async function handler(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Try Hono first for /api routes (new type-safe endpoints)
    const honoResponse = await honoApp.fetch(request);
    
    // If Hono returns 404, try Oak (legacy endpoints)
    if (honoResponse.status === 404) {
        // Convert Request to Oak context and handle
        return await oakApp.handle(request) as Response;
    }
    
    return honoResponse;
}

console.log(`🗡️  Hybrid server starting on http://localhost:${PORT}`);
console.log(`   - Hono (type-safe): /api/dice/roll, /api/battles/*, /api/campaigns/*`);
console.log(`   - Oak (legacy): remaining routes`);

Deno.serve({ port: PORT }, handler);
