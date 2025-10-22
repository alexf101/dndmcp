import { assertEquals, assertExists } from "jsr:@std/assert";
import { createBattleAPI } from "./api-battle.ts";
import { BattleStore } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";

Deno.test("Creature API - POST /api/battles/{battleId}/creatures/from-campaign/{campaignCreatureId} - route exists", async () => {
  // Create stores with DISABLE_SAVES to avoid file I/O in tests
  Deno.env.set("DISABLE_SAVES", "true");
  const campaignStore = new CampaignStore();
  const battleStore = new BattleStore(campaignStore);
  const app = createBattleAPI(battleStore, campaignStore);

  const req = new Request("http://localhost/api/battles/test-battle/creatures/from-campaign/test-creature", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      position: { x: 5, y: 3 },
    }),
  });

  const res = await app.fetch(req);
  // Should return 404 because the battle doesn't exist
  assertEquals(res.status, 404);

  const response = await res.json();
  assertEquals(response.success, false);
  assertExists(response.error);

  // Clean up
  Deno.env.delete("DISABLE_SAVES");
});

Deno.test("Creature API - POST /api/battles/{battleId}/creatures/from-campaign/{campaignCreatureId} - invalid request body", async () => {
  // Create stores with DISABLE_SAVES to avoid file I/O in tests
  Deno.env.set("DISABLE_SAVES", "true");
  const campaignStore = new CampaignStore();
  const battleStore = new BattleStore(campaignStore);
  const app = createBattleAPI(battleStore, campaignStore);

  const req = new Request("http://localhost/api/battles/test-battle/creatures/from-campaign/test-creature", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      position: "invalid", // Should be an object with x,y
    }),
  });

  const res = await app.fetch(req);
  // Should return 400 due to validation error
  assertEquals(res.status, 400);

  const response = await res.json();
  assertEquals(response.success, false);
  assertExists(response.error);

  // Clean up
  Deno.env.delete("DISABLE_SAVES");
});

Deno.test("Creature API - POST /api/battles/{battleId}/creatures/from-campaign/{campaignCreatureId} - missing body", async () => {
  // Create stores with DISABLE_SAVES to avoid file I/O in tests
  Deno.env.set("DISABLE_SAVES", "true");
  const campaignStore = new CampaignStore();
  const battleStore = new BattleStore(campaignStore);
  const app = createBattleAPI(battleStore, campaignStore);

  const req = new Request("http://localhost/api/battles/test-battle/creatures/from-campaign/test-creature", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}), // Empty body should work (position is optional)
  });

  const res = await app.fetch(req);
  // Should return 404 because the battle doesn't exist (not a validation error)
  assertEquals(res.status, 404);

  const response = await res.json();
  assertEquals(response.success, false);
  assertExists(response.error);

  // Clean up
  Deno.env.delete("DISABLE_SAVES");
});
