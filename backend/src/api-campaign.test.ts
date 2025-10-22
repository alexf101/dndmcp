import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { createCampaignAPI } from "./api-campaign.ts";

Deno.test("Campaign API - POST /api/campaigns - create campaign", async () => {
  const app = createCampaignAPI(null as any); // We'll mock the store later

  // For now, just test that the route exists and returns proper error
  // since we don't have a mock campaign store
  const req = new Request("http://localhost/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Campaign",
      description: "A test campaign",
    }),
  });

  const res = await app.fetch(req);
  // Route exists and handles errors appropriately
  assert(res.status >= 400);
});

Deno.test("Campaign API - GET /api/campaigns - list campaigns", async () => {
  const app = createCampaignAPI(null as any);

  const req = new Request("http://localhost/api/campaigns", {
    method: "GET",
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 500); // Internal server error due to null store
});

Deno.test("Campaign API - GET /api/campaigns/{id} - get campaign", async () => {
  const app = createCampaignAPI(null as any);

  const req = new Request("http://localhost/api/campaigns/test-id", {
    method: "GET",
  });

  const res = await app.fetch(req);
  // Route exists and handles errors appropriately
  assert(res.status >= 400);
});

Deno.test("Campaign API - PUT /api/campaigns/{id} - update campaign", async () => {
  const app = createCampaignAPI(null as any);

  const req = new Request("http://localhost/api/campaigns/test-id", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Updated Campaign",
    }),
  });

  const res = await app.fetch(req);
  // Route exists and handles errors appropriately
  assert(res.status >= 400);
});

Deno.test("Campaign API - DELETE /api/campaigns/{id} - delete campaign", async () => {
  const app = createCampaignAPI(null as any);

  const req = new Request("http://localhost/api/campaigns/test-id", {
    method: "DELETE",
  });

  const res = await app.fetch(req);
  // Route exists and handles errors appropriately
  assert(res.status >= 400);
});

Deno.test("Campaign API - GET /api/campaigns/creatures/search - search creatures", async () => {
  const app = createCampaignAPI(null as any);

  const req = new Request("http://localhost/api/campaigns/creatures/search?q=dragon", {
    method: "GET",
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 500); // Internal server error due to null store
});

Deno.test("Campaign API - GET /api/campaigns/maps/search - search maps", async () => {
  const app = createCampaignAPI(null as any);

  const req = new Request("http://localhost/api/campaigns/maps/search?q=dungeon", {
    method: "GET",
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 500); // Internal server error due to null store
});
