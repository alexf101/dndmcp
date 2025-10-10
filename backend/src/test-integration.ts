// Integration tests for D&D Battle Manager API
// These tests tell a complete story of battle management without stubbing

import {
    assertEquals,
    assertExists,
    assertNotEquals,
} from "https://deno.land/std@0.201.0/assert/mod.ts";
import { Application } from "@oak/oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import router, { battleStore, campaignStore } from "./routes.ts";
import {
    BattleState,
    Creature,
    APIResponse,
    Campaign,
    CampaignCreature,
} from "./types.ts";

Deno.env.set("DISABLE_SAVES", "true");

// Test utilities
class TestClient {
    private baseUrl: string;

    constructor(port: number) {
        this.baseUrl = `http://localhost:${port}`;
    }

    async get(path: string): Promise<APIResponse> {
        const response = await fetch(`${this.baseUrl}${path}`);
        return await response.json();
    }

    async post(path: string, body?: unknown): Promise<APIResponse> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
        });
        return await response.json();
    }

    async put(path: string, body: unknown): Promise<APIResponse> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return await response.json();
    }

    async delete(path: string): Promise<APIResponse> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: "DELETE",
        });
        return await response.json();
    }
}

// Test server setup
async function startTestServer(): Promise<{ port: number; close: () => void }> {
    const port = 8001; // Use different port for tests
    const app = new Application();

    app.use(oakCors({ origin: "*" }));
    app.use(router.routes());
    app.use(router.allowedMethods());

    const controller = new AbortController();
    const serverPromise = app.listen({ port, signal: controller.signal });

    // Wait a moment for server to start
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
        port,
        close: () => controller.abort(),
    };
}

// Main integration test story: A complete D&D battle workflow
Deno.test("Complete D&D Battle Workflow Integration Test", async () => {
    console.log("🗡️  Starting D&D Battle Manager Integration Test");

    // Clear any existing battles and campaigns from previous tests
    battleStore.clearAllBattles();
    campaignStore.clearAllCampaigns();

    const server = await startTestServer();
    const client = new TestClient(server.port);

    try {
        // === CHAPTER 1: Creating the Battle ===
        console.log("📖 Chapter 1: Creating the Battle");

        // Initially there should be no battles
        let battlesList = await client.get("/api/battles");
        assertEquals(battlesList.success, true);
        assertEquals((battlesList.data as BattleState[]).length, 0);
        console.log("✅ Confirmed no battles exist initially");

        // Create a new battle
        const createResult = await client.post("/api/battles", {
            name: "Goblin Ambush",
        });
        assertEquals(createResult.success, true);
        assertExists(createResult.data);

        const battle = createResult.data as BattleState;
        assertEquals(battle.name, "Goblin Ambush");
        assertEquals(battle.creatures.length, 0);
        assertEquals(battle.isActive, false);
        assertEquals(battle.round, 1); // Battles start at round 1
        assertEquals(battle.currentTurn, 0);
        console.log(`✅ Created battle: ${battle.name} (ID: ${battle.id})`);

        // Verify the battle appears in the list
        battlesList = await client.get("/api/battles");
        assertEquals((battlesList.data as BattleState[]).length, 1);
        assertEquals((battlesList.data as BattleState[])[0].id, battle.id);
        console.log("✅ Battle appears in battles list");

        // === CHAPTER 2: Adding Creatures to the Battle ===
        console.log("📖 Chapter 2: Adding Creatures to the Battle");

        // Add a goblin warrior
        const goblinData = {
            name: "Goblin Warrior",
            hp: 7,
            maxHp: 7,
            ac: 15,
            initiative: 12,
            stats: {
                str: 8,
                dex: 14,
                con: 10,
                int: 10,
                wis: 8,
                cha: 8,
            },
            statusEffects: [],
            size: "Small" as const,
            isPlayer: false,
        };

        const addGoblinResult = await client.post(
            `/api/battles/${battle.id}/creatures`,
            goblinData,
        );
        assertEquals(addGoblinResult.success, true);

        let updatedBattle = addGoblinResult.data as BattleState;
        assertEquals(updatedBattle.creatures.length, 1);
        assertEquals(updatedBattle.creatures[0].name, "Goblin Warrior");
        assertEquals(updatedBattle.creatures[0].hp, 7);
        console.log(
            `✅ Added creature: ${updatedBattle.creatures[0].name} (ID: ${updatedBattle.creatures[0].id})`,
        );

        // Add a player character
        const playerData = {
            name: "Theron the Brave",
            hp: 25,
            maxHp: 25,
            ac: 18,
            initiative: 15,
            stats: {
                str: 16,
                dex: 12,
                con: 14,
                int: 10,
                wis: 13,
                cha: 8,
            },
            statusEffects: [],
            size: "Medium" as const,
            isPlayer: true,
        };

        const addPlayerResult = await client.post(
            `/api/battles/${battle.id}/creatures`,
            playerData,
        );
        assertEquals(addPlayerResult.success, true);

        updatedBattle = addPlayerResult.data as BattleState;
        assertEquals(updatedBattle.creatures.length, 2);

        // Find the player (should be sorted by initiative, so player should be first)
        const player = updatedBattle.creatures.find((c) => c.isPlayer);
        assertExists(player);
        assertEquals(player.name, "Theron the Brave");
        console.log(`✅ Added player: ${player.name} (ID: ${player.id})`);

        // Add another goblin for a proper encounter
        const goblin2Data = {
            ...goblinData,
            name: "Goblin Archer",
            initiative: 8,
        };
        const addGoblin2Result = await client.post(
            `/api/battles/${battle.id}/creatures`,
            goblin2Data,
        );
        assertEquals(addGoblin2Result.success, true);

        updatedBattle = addGoblin2Result.data as BattleState;
        assertEquals(updatedBattle.creatures.length, 3);
        console.log("✅ Added second goblin");

        // === CHAPTER 3: Starting the Battle ===
        console.log("📖 Chapter 3: Starting the Battle");

        const startResult = await client.post(
            `/api/battles/${battle.id}/start`,
            {},
        );
        assertEquals(startResult.success, true);

        updatedBattle = startResult.data as BattleState;
        assertEquals(updatedBattle.isActive, true);
        assertEquals(updatedBattle.round, 1);

        // Creatures should be sorted by initiative (descending)
        const initiatives = updatedBattle.creatures.map((c) => c.initiative);
        for (let i = 1; i < initiatives.length; i++) {
            assertEquals(
                initiatives[i] <= initiatives[i - 1],
                true,
                "Creatures not sorted by initiative",
            );
        }
        console.log(
            `✅ Battle started! Current turn: ${
                updatedBattle.creatures[updatedBattle.currentTurn].name
            }`,
        );

        // === CHAPTER 4: Combat - Updating Creatures ===
        console.log("📖 Chapter 4: Combat - Updating Creatures");

        const currentCreature =
            updatedBattle.creatures[updatedBattle.currentTurn];
        const targetCreature = updatedBattle.creatures.find(
            (c) => c.id !== currentCreature.id,
        );
        assertExists(targetCreature);

        // Deal damage to a creature
        const damageAmount = 3;
        const updateResult = await client.put(
            `/api/battles/${battle.id}/creatures/${targetCreature.id}`,
            { hp: targetCreature.hp - damageAmount },
        );
        assertEquals(updateResult.success, true);

        updatedBattle = updateResult.data as BattleState;
        const damagedCreature = updatedBattle.creatures.find(
            (c) => c.id === targetCreature.id,
        );
        assertExists(damagedCreature);
        assertEquals(damagedCreature.hp, targetCreature.hp - damageAmount);
        console.log(
            `✅ Dealt ${damageAmount} damage to ${damagedCreature.name} (${damagedCreature.hp}/${damagedCreature.maxHp} HP)`,
        );

        // Add a status effect
        const statusEffect = {
            name: "Poisoned",
            description: "Takes poison damage each turn",
            duration: 3,
        };

        const statusResult = await client.put(
            `/api/battles/${battle.id}/creatures/${targetCreature.id}`,
            { statusEffects: [statusEffect] },
        );
        assertEquals(statusResult.success, true);

        updatedBattle = statusResult.data as BattleState;
        const poisonedCreature = updatedBattle.creatures.find(
            (c) => c.id === targetCreature.id,
        );
        assertExists(poisonedCreature);
        assertEquals(poisonedCreature.statusEffects.length, 1);
        assertEquals(poisonedCreature.statusEffects[0].name, "Poisoned");
        console.log(
            `✅ Added status effect '${statusEffect.name}' to ${poisonedCreature.name}`,
        );

        // === CHAPTER 5: Turn Management ===
        console.log("📖 Chapter 5: Turn Management");

        const initialTurn = updatedBattle.currentTurn;
        const nextTurnResult = await client.post(
            `/api/battles/${battle.id}/next-turn`,
            {},
        );
        assertEquals(nextTurnResult.success, true);

        updatedBattle = nextTurnResult.data as BattleState;
        const expectedNextTurn =
            (initialTurn + 1) % updatedBattle.creatures.length;
        assertEquals(updatedBattle.currentTurn, expectedNextTurn);
        console.log(
            `✅ Advanced turn from ${initialTurn} to ${updatedBattle.currentTurn}`,
        );

        // Advance through a full round
        const startingRound = updatedBattle.round;
        let currentTurnIndex = updatedBattle.currentTurn;

        // Complete the rest of the current round
        while (currentTurnIndex !== 0) {
            const turnResult = await client.post(
                `/api/battles/${battle.id}/next-turn`,
                {},
            );
            assertEquals(turnResult.success, true);
            updatedBattle = turnResult.data as BattleState;
            currentTurnIndex = updatedBattle.currentTurn;
        }

        // The round should have incremented when we got back to turn 0
        assertEquals(updatedBattle.round, startingRound + 1);
        console.log(
            `✅ Completed full round, now in round ${updatedBattle.round}`,
        );

        // === CHAPTER 6: Undo Functionality ===
        console.log("📖 Chapter 6: Undo Functionality");

        const beforeUndoState = { ...updatedBattle };
        const undoResult = await client.post(
            `/api/battles/${battle.id}/undo`,
            {},
        );
        assertEquals(undoResult.success, true);

        updatedBattle = undoResult.data as BattleState;
        assertNotEquals(updatedBattle.currentTurn, beforeUndoState.currentTurn);
        console.log("✅ Successfully undid last action");

        // === CHAPTER 7: Creature Removal ===
        console.log("📖 Chapter 7: Creature Removal");

        const creatureToRemove = updatedBattle.creatures.find(
            (c) => !c.isPlayer,
        );
        assertExists(creatureToRemove);

        const removeResult = await client.delete(
            `/api/battles/${battle.id}/creatures/${creatureToRemove.id}`,
        );
        assertEquals(removeResult.success, true);

        updatedBattle = removeResult.data as BattleState;
        assertEquals(updatedBattle.creatures.length, 2);

        const stillExists = updatedBattle.creatures.find(
            (c) => c.id === creatureToRemove.id,
        );
        assertEquals(stillExists, undefined);
        console.log(`✅ Removed creature: ${creatureToRemove.name}`);

        // === CHAPTER 8: Battle State Persistence ===
        console.log("📖 Chapter 8: Battle State Persistence");

        // Get battle by ID should return the same state
        const fetchResult = await client.get(`/api/battles/${battle.id}`);
        assertEquals(fetchResult.success, true);

        const fetchedBattle = fetchResult.data as BattleState;
        assertEquals(fetchedBattle.id, updatedBattle.id);
        assertEquals(
            fetchedBattle.creatures.length,
            updatedBattle.creatures.length,
        );
        assertEquals(fetchedBattle.round, updatedBattle.round);
        assertEquals(fetchedBattle.isActive, updatedBattle.isActive);
        console.log("✅ Battle state persisted correctly");

        // === EPILOGUE: Final Verification ===
        console.log("📖 Epilogue: Final Verification");

        // Verify battle list still contains our battle
        const finalBattlesList = await client.get("/api/battles");
        assertEquals(finalBattlesList.success, true);
        assertEquals((finalBattlesList.data as BattleState[]).length, 1);

        const finalBattle = (finalBattlesList.data as BattleState[])[0];
        assertEquals(finalBattle.id, battle.id);
        assertEquals(finalBattle.name, "Goblin Ambush");
        console.log("✅ Battle persists in battles list");

        console.log("🎉 Integration test completed successfully!");
        console.log(
            `📊 Final battle state: ${
                finalBattle.creatures.length
            } creatures, round ${finalBattle.round}, ${
                finalBattle.isActive ? "active" : "inactive"
            }`,
        );
    } finally {
        // Clean up to prevent timer leaks
        campaignStore.dispose();
        server.close();
        // Wait for server to close
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
});

// Error handling tests
Deno.test("API Error Handling", async () => {
    console.log("🚨 Testing API Error Handling");

    // Clear any existing battles and campaigns from previous tests
    battleStore.clearAllBattles();
    campaignStore.clearAllCampaigns();

    const server = await startTestServer();
    const client = new TestClient(server.port);

    try {
        // Test 404 for non-existent battle
        const notFoundResult = await client.get("/api/battles/non-existent-id");
        assertEquals(notFoundResult.success, false);
        assertEquals(notFoundResult.error, "Battle not found");
        console.log("✅ 404 error handling works");

        // Test validation errors
        const invalidBattleResult = await client.post("/api/battles", {});
        assertEquals(invalidBattleResult.success, false);
        assertEquals(invalidBattleResult.error, "Battle name is required");
        console.log("✅ Validation error handling works");

        // Create a battle for creature tests
        const battleResult = await client.post("/api/battles", {
            name: "Test Battle",
        });
        const battleId = (battleResult.data as BattleState).id;

        // Test invalid creature data
        const invalidCreatureResult = await client.post(
            `/api/battles/${battleId}/creatures`,
            {
                name: "Test Creature",
                // Missing required fields
            },
        );
        assertEquals(invalidCreatureResult.success, false);
        console.log("✅ Creature validation error handling works");
    } finally {
        // Clean up to prevent timer leaks
        campaignStore.dispose();
        server.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
});

// Grid-based battle test with D&D 5e map functionality
Deno.test("Grid-Based Battle with D&D 5e Map System", async () => {
    console.log("🗺️  Testing Grid-Based Battle with D&D 5e Map System");

    // Clear any existing battles and campaigns from previous tests
    battleStore.clearAllBattles();
    campaignStore.clearAllCampaigns();

    const server = await startTestServer();
    const client = new TestClient(server.port);

    try {
        // === CHAPTER 1: Create Grid-Based Battle ===
        console.log("📖 Chapter 1: Create Grid-Based Battle with Map");

        const createResult = await client.post("/api/battles", {
            name: "Dragon's Lair",
            mode: "GridBased",
            mapSize: { width: 20, height: 15 },
        });
        assertEquals(createResult.success, true);

        const battle = createResult.data as BattleState;
        assertEquals(battle.mode, "GridBased");
        assertEquals(battle.map?.width, 20);
        assertEquals(battle.map?.height, 15);
        console.log(
            `✅ Created grid-based battle: ${battle.name} (${battle.map?.width}x${battle.map?.height})`,
        );

        // === CHAPTER 2: Set Up Terrain ===
        console.log("📖 Chapter 2: Set Up Terrain");

        // Create walls around the edges
        const wallPositions = [];
        for (let x = 0; x < 20; x++) {
            wallPositions.push({ x, y: 0 }); // Top wall
            wallPositions.push({ x, y: 14 }); // Bottom wall
        }
        for (let y = 1; y < 14; y++) {
            wallPositions.push({ x: 0, y }); // Left wall
            wallPositions.push({ x: 19, y }); // Right wall
        }

        const terrainResult = await client.post(
            `/api/battles/${battle.id}/map/terrain`,
            {
                positions: wallPositions,
                terrain: "Wall",
            },
        );
        assertEquals(terrainResult.success, true);
        console.log("✅ Added walls around the perimeter");

        // Add a door
        const doorResult = await client.post(
            `/api/battles/${battle.id}/map/terrain`,
            {
                positions: [{ x: 10, y: 0 }],
                terrain: "Door",
                doorOpen: false,
            },
        );
        assertEquals(doorResult.success, true);
        console.log("✅ Added a closed door");

        // Add some difficult terrain (water)
        const waterResult = await client.post(
            `/api/battles/${battle.id}/map/terrain`,
            {
                positions: [
                    { x: 5, y: 7 },
                    { x: 6, y: 7 },
                    { x: 7, y: 7 },
                ],
                terrain: "Water",
            },
        );
        assertEquals(waterResult.success, true);
        console.log("✅ Added water terrain");

        // === CHAPTER 3: Place Creatures with Positions ===
        console.log("📖 Chapter 3: Place Creatures with Positions");

        // Add a Large dragon (2x2 squares)
        const dragonData = {
            name: "Young Red Dragon",
            hp: 178,
            maxHp: 178,
            ac: 18,
            initiative: 10,
            stats: { str: 23, dex: 10, con: 21, int: 14, wis: 11, cha: 19 },
            statusEffects: [],
            size: "Large" as const,
            position: { x: 15, y: 10 }, // Place in corner
            isPlayer: false,
        };

        const addDragonResult = await client.post(
            `/api/battles/${battle.id}/creatures`,
            dragonData,
        );
        assertEquals(addDragonResult.success, true);
        let updatedBattle = addDragonResult.data as BattleState;
        console.log("✅ Placed Large dragon (occupies 2x2 squares)");

        // Add player characters with specific positions
        const rogueData = {
            name: "Sneaky Rogue",
            hp: 20,
            maxHp: 20,
            ac: 15,
            initiative: 18,
            stats: { str: 8, dex: 18, con: 12, int: 14, wis: 13, cha: 10 },
            statusEffects: [],
            size: "Medium" as const,
            position: { x: 2, y: 2 },
            isPlayer: true,
        };

        const addRogueResult = await client.post(
            `/api/battles/${battle.id}/creatures`,
            rogueData,
        );
        assertEquals(addRogueResult.success, true);
        updatedBattle = addRogueResult.data as BattleState;
        console.log("✅ Placed Rogue at (2, 2)");

        // Try to place a creature in an invalid position (should fail)
        const invalidCreatureData = {
            ...rogueData,
            name: "Invalid Placement",
            position: { x: 15, y: 10 }, // Same as dragon
        };

        const invalidResult = await client.post(
            `/api/battles/${battle.id}/creatures`,
            invalidCreatureData,
        );
        assertEquals(invalidResult.success, false);
        console.log(
            "✅ Correctly rejected creature placement in occupied position",
        );

        // === CHAPTER 4: Creature Movement ===
        console.log("📖 Chapter 4: Creature Movement");

        const rogue = updatedBattle.creatures.find(
            (c) => c.name === "Sneaky Rogue",
        );
        assertExists(rogue);

        // Move the rogue
        const moveResult = await client.post(
            `/api/battles/${battle.id}/creatures/${rogue.id}/move`,
            {
                position: { x: 3, y: 3 },
            },
        );
        assertEquals(moveResult.success, true);
        updatedBattle = moveResult.data as BattleState;

        const movedRogue = updatedBattle.creatures.find(
            (c) => c.id === rogue.id,
        );
        assertExists(movedRogue);
        assertEquals(movedRogue.position?.x, 3);
        assertEquals(movedRogue.position?.y, 3);
        console.log("✅ Moved rogue to (3, 3)");

        // Try to move into a wall (should fail)
        const invalidMoveResult = await client.post(
            `/api/battles/${battle.id}/creatures/${rogue.id}/move`,
            {
                position: { x: 0, y: 0 }, // Wall position
            },
        );
        assertEquals(invalidMoveResult.success, false);
        console.log("✅ Correctly rejected movement into wall");

        // === CHAPTER 5: Door Interaction ===
        console.log("📖 Chapter 5: Door Interaction");

        // Open the door
        const openDoorResult = await client.post(
            `/api/battles/${battle.id}/map/doors/toggle`,
            {
                position: { x: 10, y: 0 },
            },
        );
        assertEquals(openDoorResult.success, true);
        updatedBattle = openDoorResult.data as BattleState;

        // Verify door is now open
        const doorCell = updatedBattle.map?.cells[0][10];
        assertEquals(doorCell?.terrain, "Door");
        assertEquals(doorCell?.doorOpen, true);
        console.log("✅ Opened the door");

        // Close it again
        const closeDoorResult = await client.post(
            `/api/battles/${battle.id}/map/doors/toggle`,
            {
                position: { x: 10, y: 0 },
            },
        );
        assertEquals(closeDoorResult.success, true);
        updatedBattle = closeDoorResult.data as BattleState;

        const closedDoorCell = updatedBattle.map?.cells[0][10];
        assertEquals(closedDoorCell?.doorOpen, false);
        console.log("✅ Closed the door");

        // === CHAPTER 6: Start Grid-Based Combat ===
        console.log("📖 Chapter 6: Start Grid-Based Combat");

        const startResult = await client.post(
            `/api/battles/${battle.id}/start`,
            {},
        );
        assertEquals(startResult.success, true);
        updatedBattle = startResult.data as BattleState;
        assertEquals(updatedBattle.isActive, true);

        // Rogue should go first (highest initiative: 18)
        const firstCreature =
            updatedBattle.creatures[updatedBattle.currentTurn];
        assertEquals(firstCreature.name, "Sneaky Rogue");
        console.log(`✅ Battle started, ${firstCreature.name} goes first`);

        // === EPILOGUE: Final Verification ===
        console.log("📖 Epilogue: Map System Verification");

        assertEquals(updatedBattle.mode, "GridBased");
        assertEquals(updatedBattle.map?.width, 20);
        assertEquals(updatedBattle.map?.height, 15);
        assertEquals(updatedBattle.creatures.length, 2);

        // Verify creatures have positions
        for (const creature of updatedBattle.creatures) {
            assertExists(creature.position);
            console.log(
                `  - ${creature.name} (${creature.size}) at (${creature.position.x}, ${creature.position.y})`,
            );
        }

        console.log("🎉 Grid-based battle test completed successfully!");
        console.log(
            `📊 Final state: ${updatedBattle.creatures.length} creatures on ${updatedBattle.map?.width}x${updatedBattle.map?.height} map`,
        );
    } finally {
        // Clean up to prevent timer leaks
        campaignStore.dispose();
        server.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
});

// Theatre of Mind test with descriptive text
Deno.test("Theatre of Mind Battle Mode with Descriptive Text", async () => {
    console.log("🎭 Testing Theatre of Mind Battle Mode with Descriptive Text");

    battleStore.clearAllBattles();
    campaignStore.clearAllCampaigns();

    const server = await startTestServer();
    const client = new TestClient(server.port);

    try {
        // === CHAPTER 1: Create Theatre of Mind Battle with Scene Description ===
        console.log(
            "📖 Chapter 1: Create Theatre of Mind Battle with Scene Description",
        );

        const minotaurLabyrinthDescription =
            "A dark, subterranean labyrinth with low light provided by flaming torches every 20 feet. The way is winding, with many obstacles: pit traps, swinging scythes, and horizontal spears at head-height that must be ducked under. The race begins at the edge of the labyrinth, with the finish line at the center.";

        const createResult = await client.post("/api/battles", {
            name: "Minotaur Labyrinth Race",
            mode: "TheatreOfMind",
            sceneDescription: minotaurLabyrinthDescription,
        });
        assertEquals(createResult.success, true);

        let battle = createResult.data as BattleState;
        assertEquals(battle.mode, "TheatreOfMind");
        assertEquals(battle.map, undefined);
        assertEquals(battle.sceneDescription, minotaurLabyrinthDescription);
        console.log(`✅ Created theatre of mind battle: ${battle.name}`);
        console.log(
            `✅ Scene description set: "${battle.sceneDescription?.substring(
                0,
                50,
            )}..."`,
        );

        // === CHAPTER 2: Add Creatures Without Grid Positions ===
        console.log("📖 Chapter 2: Add Creatures Without Grid Positions");

        const minotaurA = {
            name: "Minotaur Alpha",
            hp: 76,
            maxHp: 76,
            ac: 14,
            initiative: 15,
            stats: { str: 18, dex: 11, con: 16, int: 6, wis: 16, cha: 9 },
            statusEffects: [],
            size: "Large" as const,
            isPlayer: false,
        };

        const minotaurB = {
            name: "Minotaur Beta",
            hp: 76,
            maxHp: 76,
            ac: 14,
            initiative: 12,
            stats: { str: 18, dex: 11, con: 16, int: 6, wis: 16, cha: 9 },
            statusEffects: [],
            size: "Large" as const,
            isPlayer: false,
        };

        const minotaurC = {
            name: "Minotaur Gamma",
            hp: 76,
            maxHp: 76,
            ac: 14,
            initiative: 8,
            stats: { str: 18, dex: 11, con: 16, int: 6, wis: 16, cha: 9 },
            statusEffects: [],
            size: "Large" as const,
            isPlayer: false,
        };

        const addMinotaurA = await client.post(
            `/api/battles/${battle.id}/creatures`,
            minotaurA,
        );
        assertEquals(addMinotaurA.success, true);

        const addMinotaurB = await client.post(
            `/api/battles/${battle.id}/creatures`,
            minotaurB,
        );
        assertEquals(addMinotaurB.success, true);

        const addMinotaurC = await client.post(
            `/api/battles/${battle.id}/creatures`,
            minotaurC,
        );
        assertEquals(addMinotaurC.success, true);

        battle = addMinotaurC.data as BattleState;
        assertEquals(battle.creatures.length, 3);
        assertEquals(battle.creatures[0].position, undefined);
        console.log("✅ Added 3 minotaurs without grid positions");

        // === CHAPTER 3: Set Initial Creature Positions Narratively ===
        console.log("📖 Chapter 3: Set Initial Creature Positions Narratively");

        const initialPositions =
            "Minotaur Alpha leads the pack at the starting line, pawing the ground eagerly. Minotaur Beta stands ready in the center position, while Minotaur Gamma nervously checks the straps on his equipment at the rear of the group.";

        const setPositionsResult = await client.put(
            `/api/battles/${battle.id}/positions`,
            {
                positions: initialPositions,
            },
        );
        assertEquals(setPositionsResult.success, true);

        battle = setPositionsResult.data as BattleState;
        assertEquals(battle.creaturePositions, initialPositions);
        console.log(
            `✅ Set initial creature positions: "${battle.creaturePositions?.substring(
                0,
                50,
            )}..."`,
        );

        // === CHAPTER 4: Start the Race ===
        console.log("📖 Chapter 4: Start the Race");

        const startResult = await client.post(
            `/api/battles/${battle.id}/start`,
            {},
        );
        assertEquals(startResult.success, true);

        battle = startResult.data as BattleState;
        assertEquals(battle.isActive, true);

        // Alpha should go first (highest initiative: 15)
        assertEquals(
            battle.creatures[battle.currentTurn].name,
            "Minotaur Alpha",
        );
        console.log(
            `✅ Race started! ${
                battle.creatures[battle.currentTurn].name
            } goes first`,
        );

        // === CHAPTER 5: Update Scene Description During Combat ===
        console.log("📖 Chapter 5: Update Scene Description During Combat");

        const updatedSceneDescription =
            "The race is underway! Dust kicks up from thundering hooves as the minotaurs charge into the labyrinth. The first obstacle looms ahead - a series of swinging blade traps activated by pressure plates. The torchlight flickers ominously on the spinning metal.";

        const updateSceneResult = await client.put(
            `/api/battles/${battle.id}/description`,
            {
                description: updatedSceneDescription,
            },
        );
        assertEquals(updateSceneResult.success, true);

        battle = updateSceneResult.data as BattleState;
        assertEquals(battle.sceneDescription, updatedSceneDescription);
        console.log("✅ Updated scene description for dynamic environment");

        // === CHAPTER 6: Update Creature Positions Through Combat ===
        console.log("📖 Chapter 6: Update Creature Positions Through Combat");

        const combatPositions =
            "Alpha has charged ahead and successfully navigated the blade traps, taking the lead in the first corridor. Beta is close behind but got clipped by a swinging blade - he's wounded but determined. Gamma has fallen into a pit trap and is struggling to climb out, his race prospects looking grim.";

        const updatePositionsResult = await client.put(
            `/api/battles/${battle.id}/positions`,
            {
                positions: combatPositions,
            },
        );
        assertEquals(updatePositionsResult.success, true);

        battle = updatePositionsResult.data as BattleState;
        assertEquals(battle.creaturePositions, combatPositions);
        console.log("✅ Updated creature positions narratively during combat");

        // === CHAPTER 7: Verify Map Commands Are Rejected ===
        console.log("📖 Chapter 7: Verify Map Commands Are Rejected");

        // Try to use map-specific commands (should fail)
        const moveResult = await client.post(
            `/api/battles/${battle.id}/creatures/${battle.creatures[0].id}/move`,
            {
                position: { x: 5, y: 5 },
            },
        );
        assertEquals(moveResult.success, false);
        console.log(
            "✅ Correctly rejected movement command in theatre of mind battle",
        );

        const terrainResult = await client.post(
            `/api/battles/${battle.id}/map/terrain`,
            {
                positions: [{ x: 5, y: 5 }],
                terrain: "Wall",
            },
        );
        assertEquals(terrainResult.success, false);
        console.log(
            "✅ Correctly rejected terrain modification in theatre of mind battle",
        );

        // === CHAPTER 8: Test Undo with Descriptive Text ===
        console.log("📖 Chapter 8: Test Undo with Descriptive Text");

        const previousPositions = battle.creaturePositions;
        const undoResult = await client.post(
            `/api/battles/${battle.id}/undo`,
            {},
        );
        assertEquals(undoResult.success, true);

        battle = undoResult.data as BattleState;
        assertNotEquals(battle.creaturePositions, previousPositions);
        console.log("✅ Undo correctly restored previous creature positions");

        // === EPILOGUE: Final Verification ===
        console.log("📖 Epilogue: Theatre of Mind System Verification");

        assertEquals(battle.mode, "TheatreOfMind");
        assertEquals(battle.map, undefined);
        assertExists(battle.sceneDescription);
        assertExists(battle.creaturePositions);
        assertEquals(battle.creatures.length, 3);

        console.log(
            "🎉 Theatre of mind with descriptive text test completed successfully!",
        );
        console.log(
            `📊 Final state: ${battle.creatures.length} minotaurs in "${battle.name}"`,
        );
        console.log(
            `🏛️ Scene: "${battle.sceneDescription?.substring(0, 60)}..."`,
        );
        console.log(
            `👥 Positions: "${battle.creaturePositions?.substring(0, 60)}..."`,
        );
    } finally {
        // Clean up to prevent timer leaks
        campaignStore.dispose();
        server.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
});

// Campaign system integration test
Deno.test("Campaign System with Automatic Registration", async () => {
    console.log("📚 Testing Campaign System with Automatic Registration");

    // Clear all data for clean test
    battleStore.clearAllBattles();
    campaignStore.clearAllCampaigns();

    const server = await startTestServer();
    const client = new TestClient(server.port);

    try {
        // === CHAPTER 1: Verify Default Campaign Exists ===
        console.log("📖 Chapter 1: Verify Default Campaign Exists");

        const campaignsResult = await client.get("/api/campaigns");
        assertEquals(campaignsResult.success, true);

        const campaigns = campaignsResult.data as Campaign[];
        assertEquals(campaigns.length, 1);
        assertEquals(campaigns[0].name, "Default Campaign");
        assertEquals(campaigns[0].isDefault, true);

        const defaultCampaign = campaigns[0];
        console.log(
            `✅ Default campaign exists: ${defaultCampaign.name} (ID: ${defaultCampaign.id})`,
        );

        // === CHAPTER 2: Create Battle and Creatures (Auto-Registration) ===
        console.log(
            "📖 Chapter 2: Create Battle and Creatures (Auto-Registration)",
        );

        // Create a grid-based battle (map should auto-register)
        const createBattleResult = await client.post("/api/battles", {
            name: "Dragon Encounter",
            mode: "GridBased",
            mapSize: { width: 15, height: 10 },
        });
        assertEquals(createBattleResult.success, true);

        const battle = createBattleResult.data as BattleState;
        console.log(`✅ Created battle: ${battle.name}`);

        // Add creatures (should auto-register to default campaign)
        const dragonData = {
            name: "Ancient Red Dragon",
            hp: 546,
            maxHp: 546,
            ac: 22,
            initiative: 10,
            stats: { str: 30, dex: 10, con: 29, int: 18, wis: 15, cha: 23 },
            statusEffects: [],
            size: "Gargantuan" as const,
            position: { x: 7, y: 5 },
            isPlayer: false,
        };

        const fighterData = {
            name: "Sir Galahad",
            hp: 84,
            maxHp: 84,
            ac: 20,
            initiative: 15,
            stats: { str: 20, dex: 15, con: 16, int: 10, wis: 14, cha: 13 },
            statusEffects: [],
            size: "Medium" as const,
            position: { x: 2, y: 2 },
            isPlayer: true,
        };

        const addDragonResult = await client.post(
            `/api/battles/${battle.id}/creatures`,
            dragonData,
        );
        assertEquals(addDragonResult.success, true);
        console.log("✅ Added dragon to battle");

        const addFighterResult = await client.post(
            `/api/battles/${battle.id}/creatures`,
            fighterData,
        );
        assertEquals(addFighterResult.success, true);
        console.log("✅ Added fighter to battle");

        // === CHAPTER 3: Verify Auto-Registration in Default Campaign ===
        console.log(
            "📖 Chapter 3: Verify Auto-Registration in Default Campaign",
        );

        const updatedCampaignsResult = await client.get("/api/campaigns");
        const updatedCampaigns = updatedCampaignsResult.data as Campaign[];
        const updatedDefaultCampaign = updatedCampaigns.find(
            (c) => c.isDefault,
        )!;

        // Should have 2 creatures (dragon and fighter) and 1 map
        assertEquals(updatedDefaultCampaign.creatures.length, 2);
        assertEquals(updatedDefaultCampaign.maps.length, 1);
        console.log(
            `✅ Default campaign now has ${updatedDefaultCampaign.creatures.length} creatures and ${updatedDefaultCampaign.maps.length} map`,
        );

        // Verify creature templates are correct
        const dragonTemplate = updatedDefaultCampaign.creatures.find(
            (c) => c.name === "Ancient Red Dragon",
        );
        assertExists(dragonTemplate);
        assertEquals(dragonTemplate.template.hp, 546); // Should be reset to full HP
        assertEquals(dragonTemplate.usageCount, 1);
        console.log("✅ Dragon template registered correctly");

        const fighterTemplate = updatedDefaultCampaign.creatures.find(
            (c) => c.name === "Sir Galahad",
        );
        assertExists(fighterTemplate);
        assertEquals(fighterTemplate.template.isPlayer, true);
        console.log("✅ Fighter template registered correctly");

        // === CHAPTER 4: Create Additional Campaign ===
        console.log("📖 Chapter 4: Create Additional Campaign");

        const newCampaignResult = await client.post("/api/campaigns", {
            name: "Epic Dragon Campaign",
            description: "A campaign focused on dragon encounters",
        });
        assertEquals(newCampaignResult.success, true);

        const newCampaign = newCampaignResult.data as Campaign;
        assertEquals(newCampaign.isDefault, false);
        assertEquals(newCampaign.creatures.length, 0);
        console.log(`✅ Created new campaign: ${newCampaign.name}`);

        // === CHAPTER 5: Search for Creatures ===
        console.log("📖 Chapter 5: Search for Creatures");

        const searchResult = await client.get(
            "/api/campaigns/creatures/search?q=Ancient Red Dragon",
        );
        assertEquals(searchResult.success, true);

        const searchResults = searchResult.data as CampaignCreature[];
        assertEquals(searchResults.length, 1);
        assertEquals(searchResults[0].name, "Ancient Red Dragon");
        console.log(
            `✅ Found ${searchResults.length} Ancient Red Dragon(s) in search`,
        );

        // === CHAPTER 6: Use Creature from Campaign in New Battle ===
        console.log("📖 Chapter 6: Use Creature from Campaign in New Battle");

        // Create a new battle
        const newBattleResult = await client.post("/api/battles", {
            name: "Dragon Lair Revisited",
            mode: "GridBased",
            mapSize: { width: 20, height: 20 },
        });
        const newBattle = newBattleResult.data as BattleState;

        // Add the dragon from campaign
        const addFromCampaignResult = await client.post(
            `/api/battles/${newBattle.id}/creatures/from-campaign/${dragonTemplate.id}`,
            { position: { x: 10, y: 10 } },
        );
        assertEquals(addFromCampaignResult.success, true);

        const updatedBattle = addFromCampaignResult.data as BattleState;
        assertEquals(updatedBattle.creatures.length, 1);
        assertEquals(updatedBattle.creatures[0].name, "Ancient Red Dragon");
        assertEquals(updatedBattle.creatures[0].hp, 546); // Should be full HP from template
        assertNotEquals(updatedBattle.creatures[0].id, dragonTemplate.id); // Should have new ID
        console.log(
            "✅ Successfully added dragon from campaign template to new battle",
        );

        // === CHAPTER 7: Verify Usage Count Increment ===
        console.log("📖 Chapter 7: Verify Usage Count Increment");

        const finalCampaignsResult = await client.get("/api/campaigns");
        const finalDefaultCampaign = (
            finalCampaignsResult.data as Campaign[]
        ).find((c) => c.isDefault)!;
        const finalDragonTemplate = finalDefaultCampaign.creatures.find(
            (c) => c.name === "Ancient Red Dragon",
        )!;

        assertEquals(finalDragonTemplate.usageCount, 2); // Used twice now
        assertExists(finalDragonTemplate.lastUsed);
        console.log("✅ Dragon template usage count incremented correctly");

        // === CHAPTER 8: Test Campaign Management ===
        console.log("📖 Chapter 8: Test Campaign Management");

        // Update campaign
        const updateResult = await client.put(
            `/api/campaigns/${newCampaign.id}`,
            {
                name: "Epic Dragon Campaign - Updated",
                description: "Updated description",
            },
        );
        assertEquals(updateResult.success, true);
        console.log("✅ Campaign updated successfully");

        // Try to delete default campaign (should fail)
        const deleteDefaultResult = await client.delete(
            `/api/campaigns/${defaultCampaign.id}`,
        );
        assertEquals(deleteDefaultResult.success, false);
        console.log("✅ Correctly prevented deletion of default campaign");

        // Delete the custom campaign
        const deleteResult = await client.delete(
            `/api/campaigns/${newCampaign.id}`,
        );
        assertEquals(deleteResult.success, true);
        console.log("✅ Successfully deleted custom campaign");

        // === EPILOGUE: Final Verification ===
        console.log("📖 Epilogue: Campaign System Verification");

        const epilogueCampaignsResult = await client.get("/api/campaigns");
        const epilogueCampaigns = epilogueCampaignsResult.data as Campaign[];

        assertEquals(epilogueCampaigns.length, 1); // Only default should remain
        assertEquals(epilogueCampaigns[0].isDefault, true);

        // Should have 2 creatures total (2 from first battle, none new since Chapter 6 reused existing template)
        assertEquals(epilogueCampaigns[0].creatures.length, 2);
        assertEquals(epilogueCampaigns[0].maps.length, 2); // 2 maps from both battles

        console.log("🎉 Campaign system test completed successfully!");
        console.log(
            `📊 Final state: ${epilogueCampaigns[0].creatures.length} creatures, ${epilogueCampaigns[0].maps.length} maps in default campaign`,
        );
    } finally {
        // Clean up to prevent timer leaks
        campaignStore.dispose();
        server.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
});

// TODO: Add tests for the following functionality when implemented:
// - Battle templates/presets
// - Advanced status effect management (concentration, spell effects)
// - Combat calculations (damage rolls, saving throws)
// - Line of sight and range calculations
// - Campaign creature/map moving between campaigns
// - Export/import functionality
// - Real-time battle synchronization (WebSocket)

console.log("🗡️  D&D Battle Manager Integration Tests Ready!");
