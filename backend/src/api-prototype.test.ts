import { assertEquals, assertExists } from "jsr:@std/assert";
import { createPrototypeAPI } from "./api-prototype.ts";

Deno.test("Hono API Prototype - POST /api/dice/roll - success", async () => {
  const app = createPrototypeAPI();

  const req = new Request("http://localhost/api/dice/roll", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notation: "2d6+3",
      description: "Test roll",
    }),
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const data = await res.json();
  assertExists(data.id);
  assertEquals(data.notation, "2d6+3");
  assertEquals(data.description, "Test roll");
  assertEquals(data.modifier, 3);
  assertExists(data.rolls);
  assertExists(data.total);
  assertExists(data.timestamp);
  assertEquals(Array.isArray(data.rolls), true);
  assertEquals(data.rolls.length, 2);
});

Deno.test("Hono API Prototype - POST /api/dice/roll - invalid notation", async () => {
  const app = createPrototypeAPI();

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

  const data = await res.json();
  assertExists(data.error);
  assertEquals(typeof data.error, "string");
});

Deno.test("Hono API Prototype - GET /api/openapi.json - returns spec", async () => {
  const app = createPrototypeAPI();

  const req = new Request("http://localhost/api/openapi.json", {
    method: "GET",
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const spec = await res.json();
  assertExists(spec.openapi);
  assertExists(spec.paths);
  assertExists(spec.paths["/api/dice/roll"]);
  assertExists(spec.paths["/api/dice/roll"].post);
  assertEquals(spec.paths["/api/dice/roll"].post.tags.includes("mcp"), true);
});
