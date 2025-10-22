import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { rollDice } from "./dice-roller.ts";

const DiceRollRequestSchema = z.object({
  notation: z.string().openapi({
    example: "2d6+3",
    description: "Dice roll expression (e.g., 2d6+3, 1d20, 2d20kh1)",
  }),
  modifier: z.number().optional().default(0).openapi({
    example: 0,
    description: "Additional modifier to add to the roll",
  }),
  description: z.string().optional().openapi({
    example: "Attack roll",
    description: "Optional description for the roll",
  }),
});

const DiceRollResultSchema = z.object({
  id: z.string().openapi({
    example: "550e8400-e29b-41d4-a716-446655440000",
  }),
  notation: z.string().openapi({
    example: "2d6+3",
  }),
  rolls: z.array(z.number()).openapi({
    example: [6, 6],
  }),
  total: z.number().openapi({
    example: 15,
  }),
  modifier: z.number().openapi({
    example: 3,
  }),
  description: z.string().optional().openapi({
    example: "Attack roll",
  }),
  timestamp: z.number().openapi({
    example: 1634567890000,
  }),
});

const ErrorSchema = z.object({
  error: z.string().openapi({
    example: "Invalid dice expression",
  }),
});

const rollDiceRoute = createRoute({
  method: "post",
  path: "/api/dice/roll",
  tags: ["dice", "mcp"],
  summary: "Roll dice",
  description: "Roll dice using standard notation (e.g., 2d6+3)",
  request: {
    body: {
      content: {
        "application/json": {
          schema: DiceRollRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: DiceRollResultSchema,
        },
      },
      description: "Dice roll successful",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid dice expression",
    },
  },
});

export function createPrototypeAPI() {
  const app = new OpenAPIHono();

  app.openapi(rollDiceRoute, async (c) => {
    const { notation, modifier, description } = c.req.valid("json");

    try {
      const result = rollDice(notation, modifier, description);
      return c.json(result);
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : "Invalid dice expression" },
        400
      );
    }
  });

  return app;
}

export type DiceRollRequest = z.infer<typeof DiceRollRequestSchema>;
export type DiceRollResult = z.infer<typeof DiceRollResultSchema>;
