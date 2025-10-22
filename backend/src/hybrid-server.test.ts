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
