/**
 * V2 D&D Battle Manager Server
 * Integrates Hono (new type-safe routes) with Oak (legacy routes)
 */

// Using Deno.serve (built-in)
import { Application } from "@oak/oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { BattleStore } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";
import { DiceStore } from "./dice-store.ts";
import { generateRoutes } from "./route-generator.ts";
import { sseManager } from "./sse-manager.ts";
import { createPrototypeAPI } from "./api-prototype.ts";

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
console.log(`   - Hono (type-safe): /api/dice/roll`);
console.log(`   - Oak (legacy): all other routes`);

Deno.serve({ port: PORT }, handler);
