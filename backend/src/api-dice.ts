import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { DiceStore } from "./dice-store.ts";
import { rollDice } from "./dice-roller.ts";

// Zod schemas for DiceRoll based on dice-roller.ts interface
const DiceRollSchema = z.object({
  id: z.string().openapi({ example: "dice-roll-123" }),
  notation: z.string().openapi({ example: "2d20+5" }),
  rolls: z.array(z.number()).openapi({ example: [15, 18] }),
  total: z.number().openapi({ example: 38 }),
  modifier: z.number().openapi({ example: 5 }),
  description: z.string().optional().openapi({ example: "Attack roll" }),
  timestamp: z.number().openapi({ example: 1638360000000 }),
});

const DiceRollRequestSchema = z.object({
  notation: z.string().min(1).openapi({
    example: "2d20+5",
    description: "Dice notation (e.g., '2d20', '1d6+3', '4d6kh3')"
  }),
  modifier: z.number().default(0).openapi({
    example: 3,
    description: "Additional modifier to add to the roll"
  }),
  description: z.string().optional().openapi({
    example: "Attack roll with advantage",
    description: "Optional description of what this roll is for"
  }),
});

const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// Routes
const rollDiceRoute = createRoute({
  method: "post",
  path: "/api/dice/roll",
  tags: ["dice", "mcp"],
  summary: "Roll dice",
  description: "Roll dice using standard D&D notation with optional modifier and description",
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
          schema: SuccessResponseSchema(DiceRollSchema),
        },
      },
      description: "Dice rolled successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid dice notation or request",
    },
  },
});

const getDiceRollsRoute = createRoute({
  method: "get",
  path: "/api/dice/rolls",
  tags: ["dice", "mcp"],
  summary: "Get dice roll history",
  description: "Retrieve dice roll history with optional limit parameter",
  request: {
    query: z.object({
      limit: z.string().optional().openapi({
        example: "10",
        description: "Maximum number of rolls to return (default: all)"
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(z.array(DiceRollSchema)),
        },
      },
      description: "Dice roll history retrieved successfully",
    },
  },
});

export function createDiceAPI(diceStore: DiceStore) {
  const app = new OpenAPIHono();

  app.openapi(rollDiceRoute, async (c) => {
    const body = c.req.valid("json");
    const { notation, modifier = 0, description } = body;

    try {
      const result = rollDice(notation, modifier, description);
      diceStore.addRoll(result); // Add to history and broadcast via SSE
      return c.json({ success: true, data: result });
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : "Invalid dice notation" },
        400
      );
    }
  });

  app.openapi(getDiceRollsRoute, (c) => {
    const limit = c.req.query("limit");
    const rolls = diceStore.getAllRolls(limit ? parseInt(limit) : undefined);
    return c.json({ success: true, data: rolls });
  });

  return app;
}

export type DiceRollRequest = z.infer<typeof DiceRollRequestSchema>;
