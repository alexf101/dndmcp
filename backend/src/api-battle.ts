import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { BattleStore } from "./battle-store.ts";
import type { CampaignStore } from "./campaign-store.ts";
import { ImpossibleCommandError } from "./errors.ts";

const GridPositionSchema = z.object({
  x: z.number().int().min(0).openapi({ example: 5 }),
  y: z.number().int().min(0).openapi({ example: 3 }),
});

const CreatureSizeSchema = z.enum(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]);

const StatusEffectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  duration: z.number().optional(),
  concentration: z.boolean().optional(),
});

const CreatureStatsSchema = z.object({
  str: z.number().int().min(1).max(30),
  dex: z.number().int().min(1).max(30),
  con: z.number().int().min(1).max(30),
  int: z.number().int().min(1).max(30),
  wis: z.number().int().min(1).max(30),
  cha: z.number().int().min(1).max(30),
});

const CreatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  hp: z.number().int(),
  maxHp: z.number().int().positive(),
  ac: z.number().int().min(0),
  initiative: z.number().int(),
  stats: CreatureStatsSchema,
  statusEffects: z.array(StatusEffectSchema),
  position: GridPositionSchema.optional(),
  size: CreatureSizeSchema,
  isPlayer: z.boolean(),
});

const BattleModeSchema = z.enum(["TheatreOfMind", "GridBased"]);

const TerrainTypeSchema = z.enum([
  "Empty",
  "Wall",
  "DifficultTerrain",
  "Water",
  "Pit",
  "Door",
  "Window",
  "Cover",
  "HeavyCover",
  "Stairs",
  "Hazard",
]);

const MapCellSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  terrain: TerrainTypeSchema,
  doorOpen: z.boolean().optional(),
  elevation: z.number().optional(),
  hazardDamage: z.number().optional(),
});

const BattleMapSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  cells: z.array(z.array(MapCellSchema)),
  description: z.string().optional(),
});

const BattleActionSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  type: z.string(),
  data: z.any(),
  previousState: z.any().optional(),
});

const BattleStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  creatures: z.array(CreatureSchema),
  currentTurn: z.number().int().min(0),
  round: z.number().int().min(0),
  isActive: z.boolean(),
  history: z.array(BattleActionSchema),
  mode: BattleModeSchema,
  map: BattleMapSchema.optional(),
  sceneDescription: z.string().optional(),
  creaturePositions: z.string().optional(),
});

const BattleSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: BattleModeSchema,
  creatureCount: z.number().int().min(0),
  status: z.enum(["active", "inactive"]),
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

const listBattlesRoute = createRoute({
  method: "get",
  path: "/api/battles",
  tags: ["battle", "mcp"],
  summary: "List all battles",
  description: "Get a list of all battles with their summaries",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(z.array(BattleSummarySchema)),
        },
      },
      description: "List of all battles",
    },
  },
});

const CreateBattleRequestSchema = z.object({
  name: z.string().min(1).openapi({ example: "Goblin Ambush" }),
  mode: BattleModeSchema.optional().default("TheatreOfMind"),
  mapSize: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  sceneDescription: z.string().optional().openapi({
    example: "A dark forest path where goblins lie in wait",
  }),
});

const createBattleRoute = createRoute({
  method: "post",
  path: "/api/battles",
  tags: ["battle", "mcp"],
  summary: "Create a new battle",
  description: "Create a new battle with the specified name and configuration",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateBattleRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Battle created successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid request",
    },
  },
});

const getBattleRoute = createRoute({
  method: "get",
  path: "/api/battles/{id}",
  tags: ["battle", "mcp"],
  summary: "Get battle details",
  description: "Get detailed information about a specific battle",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Battle details",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle not found",
    },
  },
});

const AddCreatureRequestSchema = z.object({
  name: z.string().min(1).openapi({ example: "Goblin Warrior" }),
  hp: z.number().int().positive().openapi({ example: 7 }),
  maxHp: z.number().int().positive().openapi({ example: 7 }),
  ac: z.number().int().min(0).default(10).openapi({ example: 15 }),
  initiative: z.number().int().default(0).openapi({ example: 12 }),
  stats: CreatureStatsSchema.default({
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  }),
  statusEffects: z.array(StatusEffectSchema).default([]),
  position: GridPositionSchema.optional(),
  size: CreatureSizeSchema.default("Medium"),
  isPlayer: z.boolean().default(false),
});

const addCreatureRoute = createRoute({
  method: "post",
  path: "/api/battles/{id}/creatures",
  tags: ["battle", "mcp"],
  summary: "Add creature to battle",
  description: "Add a new creature to an existing battle",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: AddCreatureRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Creature added successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle not found",
    },
  },
});

const UpdateCreatureRequestSchema = z.object({
  name: z.string().optional(),
  hp: z.number().int().optional(),
  maxHp: z.number().int().positive().optional(),
  ac: z.number().int().min(0).optional(),
  initiative: z.number().int().optional(),
  stats: CreatureStatsSchema.optional(),
  statusEffects: z.array(StatusEffectSchema).optional(),
  position: GridPositionSchema.optional(),
  size: CreatureSizeSchema.optional(),
  isPlayer: z.boolean().optional(),
});

const updateCreatureRoute = createRoute({
  method: "put",
  path: "/api/battles/{id}/creatures/{creatureId}",
  tags: ["battle", "mcp"],
  summary: "Update creature",
  description: "Update properties of a creature in battle",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
      creatureId: z.string().openapi({ example: "creature-456" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateCreatureRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Creature updated successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle or creature not found",
    },
  },
});

const removeCreatureRoute = createRoute({
  method: "delete",
  path: "/api/battles/{id}/creatures/{creatureId}",
  tags: ["battle", "mcp"],
  summary: "Remove creature from battle",
  description: "Remove a creature from an existing battle",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
      creatureId: z.string().openapi({ example: "creature-456" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Creature removed successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle or creature not found",
    },
  },
});

const MoveCreatureRequestSchema = z.object({
  position: GridPositionSchema,
});

const moveCreatureRoute = createRoute({
  method: "post",
  path: "/api/battles/{id}/creatures/{creatureId}/move",
  tags: ["battle", "mcp"],
  summary: "Move creature",
  description: "Move a creature to a new position on the battle map",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
      creatureId: z.string().openapi({ example: "creature-456" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: MoveCreatureRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Creature moved successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid move (e.g., outside map bounds, impossible command)",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle or creature not found",
    },
  },
});

const nextTurnRoute = createRoute({
  method: "post",
  path: "/api/battles/{id}/next-turn",
  tags: ["battle", "mcp"],
  summary: "Advance to next turn",
  description: "Move to the next creature's turn in initiative order",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Advanced to next turn",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle not found",
    },
  },
});

const startBattleRoute = createRoute({
  method: "post",
  path: "/api/battles/{id}/start",
  tags: ["battle", "mcp"],
  summary: "Start battle",
  description: "Start the battle and begin tracking initiative",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Battle started",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle not found",
    },
  },
});

const undoRoute = createRoute({
  method: "post",
  path: "/api/battles/{id}/undo",
  tags: ["battle", "mcp"],
  summary: "Undo last action",
  description: "Undo the last action performed in the battle",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Action undone successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle not found or no actions to undo",
    },
  },
});

const SetTerrainRequestSchema = z.object({
  positions: z.array(GridPositionSchema).min(1),
  terrain: TerrainTypeSchema,
  doorOpen: z.boolean().optional(),
  elevation: z.number().optional(),
  hazardDamage: z.number().optional(),
});

const setTerrainRoute = createRoute({
  method: "post",
  path: "/api/battles/{id}/map/terrain",
  tags: ["battle", "mcp"],
  summary: "Set terrain",
  description: "Set terrain type for one or more map cells",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: SetTerrainRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Terrain updated successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid request (e.g., not a grid-based battle)",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle not found",
    },
  },
});

const ToggleDoorRequestSchema = z.object({
  position: GridPositionSchema,
});

const toggleDoorRoute = createRoute({
  method: "post",
  path: "/api/battles/{id}/map/doors/toggle",
  tags: ["battle", "mcp"],
  summary: "Toggle door",
  description: "Open or close a door on the battle map",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: ToggleDoorRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Door toggled successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid request (e.g., position doesn't have a door)",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle not found",
    },
  },
});

const UpdateSceneDescriptionRequestSchema = z.object({
  description: z.string(),
});

const updateSceneDescriptionRoute = createRoute({
  method: "put",
  path: "/api/battles/{id}/description",
  tags: ["battle", "mcp"],
  summary: "Update scene description",
  description: "Update the narrative description of the battle scene (for Theatre of Mind)",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateSceneDescriptionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Scene description updated",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle not found",
    },
  },
});

const UpdateCreaturePositionsRequestSchema = z.object({
  positions: z.string(),
});

const updateCreaturePositionsRoute = createRoute({
  method: "put",
  path: "/api/battles/{id}/positions",
  tags: ["battle", "mcp"],
  summary: "Update creature positions description",
  description:
    "Update the narrative description of creature positions (for Theatre of Mind)",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "battle-123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateCreaturePositionsRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SuccessResponseSchema(BattleStateSchema),
        },
      },
      description: "Creature positions description updated",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Battle not found",
    },
  },
});

export function createBattleAPI(battleStore: BattleStore, _campaignStore: CampaignStore) {
  const app = new OpenAPIHono();

  app.openapi(listBattlesRoute, (c) => {
    const battles = battleStore.getAllBattles();
    return c.json({ success: true, data: battles });
  });

  app.openapi(createBattleRoute, async (c) => {
    const body = c.req.valid("json");
    const { name, mode, mapSize, sceneDescription } = body;

    const battle = battleStore.createBattle(name, mode, mapSize, sceneDescription);
    return c.json({ success: true, data: battle });
  });

  app.openapi(getBattleRoute, (c) => {
    const { id } = c.req.valid("param");
    const battle = battleStore.getBattle(id);

    if (!battle) {
      return c.json({ success: false, error: "Battle not found" }, 404);
    }

    return c.json({ success: true, data: battle });
  });

  app.openapi(addCreatureRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const battle = battleStore.addCreature(id, body);

    if (!battle) {
      return c.json({ success: false, error: "Battle not found" }, 404);
    }

    return c.json({ success: true, data: battle });
  });

  app.openapi(updateCreatureRoute, async (c) => {
    const { id, creatureId } = c.req.valid("param");
    const updates = c.req.valid("json");

    const battle = battleStore.updateCreature(id, creatureId, updates);

    if (!battle) {
      return c.json(
        { success: false, error: "Battle or creature not found" },
        404
      );
    }

    return c.json({ success: true, data: battle });
  });

  app.openapi(removeCreatureRoute, (c) => {
    const { id, creatureId } = c.req.valid("param");

    const battle = battleStore.removeCreature(id, creatureId);

    if (!battle) {
      return c.json(
        { success: false, error: "Battle or creature not found" },
        404
      );
    }

    return c.json({ success: true, data: battle });
  });

  app.openapi(moveCreatureRoute, async (c) => {
    const { id, creatureId } = c.req.valid("param");
    const { position } = c.req.valid("json");

    try {
      const battle = battleStore.moveCreature(id, creatureId, position);

      if (!battle) {
        return c.json(
          { success: false, error: "Battle or creature not found" },
          404
        );
      }

      return c.json({ success: true, data: battle });
    } catch (error) {
      if (error instanceof ImpossibleCommandError) {
        return c.json(
          { success: false, error: `Impossible command: ${error.message}` },
          400
        );
      }
      throw error;
    }
  });

  app.openapi(nextTurnRoute, (c) => {
    const { id } = c.req.valid("param");

    const battle = battleStore.nextTurn(id);

    if (!battle) {
      return c.json({ success: false, error: "Battle not found" }, 404);
    }

    return c.json({ success: true, data: battle });
  });

  app.openapi(startBattleRoute, (c) => {
    const { id } = c.req.valid("param");

    const battle = battleStore.startBattle(id);

    if (!battle) {
      return c.json({ success: false, error: "Battle not found" }, 404);
    }

    return c.json({ success: true, data: battle });
  });

  app.openapi(undoRoute, (c) => {
    const { id } = c.req.valid("param");

    const battle = battleStore.undo(id);

    if (!battle) {
      return c.json(
        { success: false, error: "Battle not found or no actions to undo" },
        404
      );
    }

    return c.json({ success: true, data: battle });
  });

  app.openapi(setTerrainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      const battle = battleStore.setTerrain(id, body);

      if (!battle) {
        return c.json(
          { success: false, error: "Battle not found or not a grid-based battle" },
          404
        );
      }

      return c.json({ success: true, data: battle });
    } catch (error) {
      if (error instanceof ImpossibleCommandError) {
        return c.json(
          { success: false, error: `Impossible command: ${error.message}` },
          400
        );
      }
      throw error;
    }
  });

  app.openapi(toggleDoorRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { position } = c.req.valid("json");

    try {
      const battle = battleStore.toggleDoor(id, position);

      if (!battle) {
        return c.json(
          { success: false, error: "Battle not found or not a grid-based battle" },
          404
        );
      }

      return c.json({ success: true, data: battle });
    } catch (error) {
      if (error instanceof ImpossibleCommandError) {
        return c.json(
          { success: false, error: `Impossible command: ${error.message}` },
          400
        );
      }
      throw error;
    }
  });

  app.openapi(updateSceneDescriptionRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { description } = c.req.valid("json");

    const battle = battleStore.updateSceneDescription(id, description);

    if (!battle) {
      return c.json({ success: false, error: "Battle not found" }, 404);
    }

    return c.json({ success: true, data: battle });
  });

  app.openapi(updateCreaturePositionsRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { positions } = c.req.valid("json");

    const battle = battleStore.updateCreaturePositions(id, positions);

    if (!battle) {
      return c.json({ success: false, error: "Battle not found" }, 404);
    }

    return c.json({ success: true, data: battle });
  });

  return app;
}

export type CreateBattleRequest = z.infer<typeof CreateBattleRequestSchema>;
export type AddCreatureRequest = z.infer<typeof AddCreatureRequestSchema>;
export type UpdateCreatureRequest = z.infer<typeof UpdateCreatureRequestSchema>;
