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

  const response = await res.json();
  assertEquals(response.success, true);
  const data = response.data;
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
  assertEquals(data.success, false);
  assertExists(data.error);
  assertEquals(typeof data.error, "string");
});


