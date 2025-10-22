import { Hono } from "hono";
import { z } from "zod";
import { rollDice } from "./dice-roller.ts";

export function createPrototypeAPI() {
const app = new Hono();

app.post("/api/dice/roll", async (c) => {
  try {
    const body = await c.req.json();
  const { notation, modifier = 0, description } = body;

    if (!notation || typeof notation !== "string") {
      return c.json(
      { success: false, error: "Dice notation required" },
      400
      );
      }

      const result = rollDice(notation, modifier, description);
      return c.json({ success: true, data: result });
    } catch (error) {
    return c.json(
    { success: false, error: error instanceof Error ? error.message : "Invalid dice expression" },
        400
    );
}
  });

return app;
}
