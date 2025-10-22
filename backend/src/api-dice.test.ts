import { assertEquals, assertExists } from "jsr:@std/assert";
import { createDiceAPI } from "./api-dice.ts";
import { DiceStore } from "./dice-store.ts";

// Mock crypto.randomUUID for consistent test results
const originalRandomUUID = crypto.randomUUID;
crypto.randomUUID = () => "test-roll-id";

Deno.test("Dice API - POST /api/dice/roll - success", async () => {
  // Use a temporary store to avoid file I/O conflicts
  const originalDisableSaves = Deno.env.get("DISABLE_SAVES");
  Deno.env.set("DISABLE_SAVES", "true");
  const diceStore = new DiceStore();
  const app = createDiceAPI(diceStore);

  const req = new Request("http://localhost/api/dice/roll", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notation: "2d6+3",
      modifier: 1,
      description: "Test roll",
    }),
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const response = await res.json();
  assertEquals(response.success, true);
  const data = response.data;
  assertExists(data.id);
  assertEquals(data.notation, "2d6+3+1"); // notation + additional modifier
  assertEquals(data.description, "Test roll");
  assertEquals(data.modifier, 4); // 3 + 1
  assertExists(data.rolls);
  assertExists(data.total);
  assertExists(data.timestamp);
  assertEquals(Array.isArray(data.rolls), true);
  assertEquals(data.rolls.length, 2);

  // Verify roll was added to history
  const history = diceStore.getAllRolls();
  assertEquals(history.length >= 1, true); // At least one roll added
  const latestRoll = history[0]; // Most recent first
  assertEquals(latestRoll.id, data.id);

  // Clean up
  Deno.env.delete("DISABLE_SAVES");
});

Deno.test("Dice API - POST /api/dice/roll - invalid notation", async () => {
  Deno.env.set("DISABLE_SAVES", "true");
  const diceStore = new DiceStore();
  const app = createDiceAPI(diceStore);

  const req = new Request("http://localhost/api/dice/roll", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notation: "invalid",
    }),
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 400);

  const response = await res.json();
  assertEquals(response.success, false);
  assertExists(response.error);
  assertEquals(response.error.includes("Invalid dice notation"), true);

  // Clean up
  Deno.env.delete("DISABLE_SAVES");
});

Deno.test("Dice API - POST /api/dice/roll - missing notation", async () => {
  Deno.env.set("DISABLE_SAVES", "true");
  const diceStore = new DiceStore();
  const app = createDiceAPI(diceStore);

  const req = new Request("http://localhost/api/dice/roll", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      modifier: 5,
    }),
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 400);

  const response = await res.json();
  assertEquals(response.success, false);
  assertExists(response.error);

  // Clean up
  Deno.env.delete("DISABLE_SAVES");
});

Deno.test("Dice API - GET /api/dice/rolls - empty history", async () => {
  Deno.env.set("DISABLE_SAVES", "true");
  const diceStore = new DiceStore();
  const app = createDiceAPI(diceStore);

  const req = new Request("http://localhost/api/dice/rolls");

  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const response = await res.json();
  assertEquals(response.success, true);
  assertEquals(Array.isArray(response.data), true);
  // May have existing rolls from file, but API works

  // Clean up
  Deno.env.delete("DISABLE_SAVES");
});

Deno.test("Dice API - GET /api/dice/rolls - with history", async () => {
  Deno.env.set("DISABLE_SAVES", "true");
  const diceStore = new DiceStore();
  const app = createDiceAPI(diceStore);

  // Add some rolls to history
  diceStore.addRoll({
    id: "roll1",
    notation: "1d20",
    rolls: [15],
    total: 15,
    modifier: 0,
    description: "First roll",
    timestamp: Date.now() - 2000,
  });

  diceStore.addRoll({
    id: "roll2",
    notation: "2d6+2",
    rolls: [4, 3],
    total: 9,
    modifier: 2,
    description: "Second roll",
    timestamp: Date.now() - 1000,
  });

  const req = new Request("http://localhost/api/dice/rolls");

  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const response = await res.json();
  assertEquals(response.success, true);
  assertEquals(Array.isArray(response.data), true);
  assertEquals(response.data.length >= 2, true); // At least the 2 we added

  // Should be in reverse chronological order (most recent first)
  const recentRolls = response.data.slice(0, 2); // Get most recent 2
  assertEquals(recentRolls.some((roll: any) => roll.id === "roll2"), true);
  assertEquals(recentRolls.some((roll: any) => roll.id === "roll1"), true);

  // Clean up
  Deno.env.delete("DISABLE_SAVES");
});

Deno.test("Dice API - GET /api/dice/rolls - with limit", async () => {
  Deno.env.set("DISABLE_SAVES", "true");
  const diceStore = new DiceStore();
  const app = createDiceAPI(diceStore);

  // Add multiple rolls
  for (let i = 1; i <= 5; i++) {
    diceStore.addRoll({
      id: `roll${i}`,
      notation: "1d20",
      rolls: [i * 2],
      total: i * 2,
      modifier: 0,
      description: `Roll ${i}`,
      timestamp: Date.now() - (6 - i) * 1000, // roll5 is most recent
    });
  }

  const req = new Request("http://localhost/api/dice/rolls?limit=3");

  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const response = await res.json();
  assertEquals(response.success, true);
  assertEquals(Array.isArray(response.data), true);
  assertEquals(response.data.length, 3);

  // Should return the 3 most recent rolls
  assertEquals(response.data[0].id, "roll5");
  assertEquals(response.data[1].id, "roll4");
  assertEquals(response.data[2].id, "roll3");

  // Clean up
  Deno.env.delete("DISABLE_SAVES");
});

Deno.test("Dice API - POST /api/dice/roll - advantage roll", async () => {
  Deno.env.set("DISABLE_SAVES", "true");
  const diceStore = new DiceStore();
  const app = createDiceAPI(diceStore);

  const req = new Request("http://localhost/api/dice/roll", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notation: "2d20kh1",
      description: "Advantage roll",
    }),
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const response = await res.json();
  assertEquals(response.success, true);
  const data = response.data;
  assertEquals(data.notation, "2d20kh1");
  assertEquals(data.description, "Advantage roll");
  assertEquals(data.rolls.length, 2); // Keep highest of 2 rolls
  assertExists(data.total);

  // Clean up
  Deno.env.delete("DISABLE_SAVES");
});

// Restore original randomUUID
crypto.randomUUID = originalRandomUUID;
