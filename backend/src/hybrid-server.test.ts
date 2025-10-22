/**
 * Integration tests for hybrid Hono+Oak server
 * Tests that both new type-safe routes and legacy routes work
 */

import { assertEquals, assertExists } from "jsr:@std/assert";

const BASE_URL = "http://localhost:8000";

// Helper to check if server is running
async function isServerRunning(): Promise<boolean> {
    try {
        await fetch(BASE_URL);
        return true;
    } catch {
        return false;
    }
}

Deno.test({
    name: "Hybrid Server - New Hono endpoint: POST /api/dice/roll",
    ignore: !await isServerRunning(),
    fn: async () => {
        const response = await fetch(`${BASE_URL}/api/dice/roll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                notation: "2d6+3",
                modifier: 0,
                description: "Integration test roll",
            }),
        });

        assertEquals(response.status, 200);
        const data = await response.json();

        // Verify response structure matches Zod schema
        assertExists(data.id);
        assertExists(data.notation);
        assertExists(data.rolls);
        assertExists(data.total);
        assertExists(data.modifier);
        assertExists(data.timestamp);
        assertEquals(data.description, "Integration test roll");
        assertEquals(Array.isArray(data.rolls), true);
        assertEquals(data.rolls.length, 2);
    },
});

Deno.test({
    name: "Hybrid Server - New Hono endpoint: Invalid dice notation",
    ignore: !await isServerRunning(),
    fn: async () => {
        const response = await fetch(`${BASE_URL}/api/dice/roll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                notation: "invalid-notation",
                modifier: 0,
            }),
        });

        assertEquals(response.status, 400);
        const data = await response.json();
        assertExists(data.error);
        assertEquals(typeof data.error, "string");
    },
});

Deno.test({
    name: "Hybrid Server - OpenAPI spec served by Hono",
    ignore: !await isServerRunning(),
    fn: async () => {
        const response = await fetch(`${BASE_URL}/api/openapi.json`);
        assertEquals(response.status, 200);

        const spec = await response.json();
        assertExists(spec.openapi);
        assertExists(spec.info);
        assertExists(spec.paths);
        assertExists(spec.paths["/api/dice/roll"]);
        
        // Verify it's tagged for MCP
        const rollEndpoint = spec.paths["/api/dice/roll"].post;
        assertEquals(rollEndpoint.tags.includes("mcp"), true);
    },
});

Deno.test({
    name: "Hybrid Server - Legacy Oak endpoint: GET /api/battles",
    ignore: !await isServerRunning(),
    fn: async () => {
        const response = await fetch(`${BASE_URL}/api/battles`);
        assertEquals(response.status, 200);

        const data = await response.json();
        assertExists(data.success);
        assertEquals(data.success, true);
        assertExists(data.data);
        assertEquals(Array.isArray(data.data), true);
    },
});

Deno.test({
    name: "Hybrid Server - CORS headers present",
    ignore: !await isServerRunning(),
    fn: async () => {
        const response = await fetch(`${BASE_URL}/api/dice/roll`, {
            method: "OPTIONS",
            headers: {
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            },
        });

        const corsHeader = response.headers.get("access-control-allow-origin");
        assertEquals(corsHeader, "http://localhost:5173");
    },
});

Deno.test({
    name: "Hybrid Server - Battle Routes: GET /api/battles (list battles)",
    ignore: !await isServerRunning(),
    fn: async () => {
        const response = await fetch(`${BASE_URL}/api/battles`);
        assertEquals(response.status, 200);

        const data = await response.json();
        assertExists(data.success);
        assertEquals(data.success, true);
        assertExists(data.data);
        assertEquals(Array.isArray(data.data), true);
    },
});

Deno.test({
    name: "Hybrid Server - Battle Routes: POST /api/battles (create battle)",
    ignore: !await isServerRunning(),
    fn: async () => {
        const response = await fetch(`${BASE_URL}/api/battles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Test Battle",
                mode: "TheatreOfMind",
                sceneDescription: "A dark dungeon corridor",
            }),
        });

        assertEquals(response.status, 200);
        const data = await response.json();

        assertExists(data.success);
        assertEquals(data.success, true);
        assertExists(data.data);
        assertExists(data.data.id);
        assertEquals(data.data.name, "Test Battle");
        assertEquals(data.data.mode, "TheatreOfMind");
        assertEquals(data.data.sceneDescription, "A dark dungeon corridor");
    },
});

Deno.test({
    name: "Hybrid Server - Battle Routes: GET /api/battles/{id} (get battle)",
    ignore: !await isServerRunning(),
    fn: async () => {
        // First create a battle
        const createResponse = await fetch(`${BASE_URL}/api/battles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Get Test Battle",
                mode: "GridBased",
                mapSize: { width: 10, height: 10 },
            }),
        });

        const createData = await createResponse.json();
        const battleId = createData.data.id;

        // Then get it
        const response = await fetch(`${BASE_URL}/api/battles/${battleId}`);
        assertEquals(response.status, 200);

        const data = await response.json();
        assertEquals(data.success, true);
        assertExists(data.data);
        assertEquals(data.data.id, battleId);
        assertEquals(data.data.name, "Get Test Battle");
        assertEquals(data.data.mode, "GridBased");
    },
});

Deno.test({
    name: "Hybrid Server - Battle Routes: POST /api/battles/{id}/creatures (add creature)",
    ignore: !await isServerRunning(),
    fn: async () => {
        // Create a battle first
        const createResponse = await fetch(`${BASE_URL}/api/battles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Creature Test Battle",
                mode: "TheatreOfMind",
            }),
        });

        const createData = await createResponse.json();
        const battleId = createData.data.id;

        // Add a creature
        const response = await fetch(`${BASE_URL}/api/battles/${battleId}/creatures`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Goblin",
                hp: 7,
                maxHp: 7,
                ac: 15,
                initiative: 12,
                size: "Small",
                isPlayer: false,
            }),
        });

        assertEquals(response.status, 200);
        const data = await response.json();

        assertEquals(data.success, true);
        assertExists(data.data);
        assertEquals(data.data.creatures.length, 1);
        assertEquals(data.data.creatures[0].name, "Goblin");
        assertEquals(data.data.creatures[0].hp, 7);
        assertEquals(data.data.creatures[0].size, "Small");
    },
});

Deno.test({
    name: "Hybrid Server - Battle Routes: PUT /api/battles/{id}/creatures/{creatureId} (update creature)",
    ignore: !await isServerRunning(),
    fn: async () => {
        // Create battle and creature
        const createBattleResponse = await fetch(`${BASE_URL}/api/battles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Update Creature Battle" }),
        });
        const battleData = await createBattleResponse.json();
        const battleId = battleData.data.id;

        const addCreatureResponse = await fetch(`${BASE_URL}/api/battles/${battleId}/creatures`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Orc",
                hp: 15,
                maxHp: 15,
                size: "Medium",
            }),
        });
        const creatureData = await addCreatureResponse.json();
        const creatureId = creatureData.data.creatures[0].id;

        // Update creature HP
        const response = await fetch(
            `${BASE_URL}/api/battles/${battleId}/creatures/${creatureId}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hp: 10 }),
            }
        );

        assertEquals(response.status, 200);
        const data = await response.json();

        assertEquals(data.success, true);
        assertEquals(data.data.creatures[0].hp, 10);
        assertEquals(data.data.creatures[0].maxHp, 15);
    },
});

Deno.test({
    name: "Hybrid Server - Battle Routes: DELETE /api/battles/{id}/creatures/{creatureId} (remove creature)",
    ignore: !await isServerRunning(),
    fn: async () => {
        // Create battle and creature
        const createBattleResponse = await fetch(`${BASE_URL}/api/battles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Remove Creature Battle" }),
        });
        const battleData = await createBattleResponse.json();
        const battleId = battleData.data.id;

        const addCreatureResponse = await fetch(`${BASE_URL}/api/battles/${battleId}/creatures`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Skeleton",
                hp: 13,
                maxHp: 13,
                size: "Medium",
            }),
        });
        const creatureData = await addCreatureResponse.json();
        const creatureId = creatureData.data.creatures[0].id;

        // Remove creature
        const response = await fetch(
            `${BASE_URL}/api/battles/${battleId}/creatures/${creatureId}`,
            {
                method: "DELETE",
            }
        );

        assertEquals(response.status, 200);
        const data = await response.json();

        assertEquals(data.success, true);
        assertEquals(data.data.creatures.length, 0);
    },
});

Deno.test({
    name: "Hybrid Server - Battle Routes: POST /api/battles/{id}/start (start battle)",
    ignore: !await isServerRunning(),
    fn: async () => {
        // Create battle with creatures
        const createBattleResponse = await fetch(`${BASE_URL}/api/battles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Start Battle Test" }),
        });
        const battleData = await createBattleResponse.json();
        const battleId = battleData.data.id;

        const addCreatureResp = await fetch(`${BASE_URL}/api/battles/${battleId}/creatures`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Fighter",
                hp: 20,
                maxHp: 20,
                initiative: 15,
            }),
        });
        await addCreatureResp.json();

        // Start battle
        const response = await fetch(`${BASE_URL}/api/battles/${battleId}/start`, {
            method: "POST",
        });

        assertEquals(response.status, 200);
        const data = await response.json();

        assertEquals(data.success, true);
        assertEquals(data.data.isActive, true);
    },
});

Deno.test({
    name: "Hybrid Server - Battle Routes: POST /api/battles/{id}/next-turn (advance turn)",
    ignore: !await isServerRunning(),
    fn: async () => {
        // Create and start battle
        const createBattleResponse = await fetch(`${BASE_URL}/api/battles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Next Turn Test" }),
        });
        const battleData = await createBattleResponse.json();
        const battleId = battleData.data.id;

        const addCreatureResp = await fetch(`${BASE_URL}/api/battles/${battleId}/creatures`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Wizard", hp: 15, maxHp: 15, initiative: 18 }),
        });
        await addCreatureResp.json();

        const startResp = await fetch(`${BASE_URL}/api/battles/${battleId}/start`, { method: "POST" });
        await startResp.json();

        // Advance turn
        const response = await fetch(`${BASE_URL}/api/battles/${battleId}/next-turn`, {
            method: "POST",
        });

        assertEquals(response.status, 200);
        const data = await response.json();

        assertEquals(data.success, true);
        assertExists(data.data.currentTurn);
    },
});

Deno.test({
    name: "Hybrid Server - Battle Routes: 404 for non-existent battle",
    ignore: !await isServerRunning(),
    fn: async () => {
        const response = await fetch(`${BASE_URL}/api/battles/non-existent-battle-id`);
        assertEquals(response.status, 404);

        const data = await response.json();
        assertEquals(data.success, false);
        assertExists(data.error);
    },
});
