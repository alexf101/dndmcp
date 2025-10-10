// Shared types between frontend and backend

// D&D 5e creature sizes (in grid squares)
export type CreatureSize =
    | "Tiny"
    | "Small"
    | "Medium"
    | "Large"
    | "Huge"
    | "Gargantuan";

export const CREATURE_SIZE_INFO: Record<
    CreatureSize,
    {
        gridSize: number; // How many squares the creature occupies (gridSize x gridSize)
        reach: number; // Reach in feet (for attacks)
    }
> = {
    Tiny: { gridSize: 1, reach: 0 }, // Less than 1 square, but we'll use 1
    Small: { gridSize: 1, reach: 5 }, // 1 square
    Medium: { gridSize: 1, reach: 5 }, // 1 square
    Large: { gridSize: 2, reach: 5 }, // 2x2 squares (10x10 feet)
    Huge: { gridSize: 3, reach: 10 }, // 3x3 squares (15x15 feet)
    Gargantuan: { gridSize: 4, reach: 15 }, // 4x4 squares or larger (20x20+ feet)
};

// Position on the battle map grid
export interface GridPosition {
    x: number; // X coordinate (0-based)
    y: number; // Y coordinate (0-based)
}

export interface Creature {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    ac: number;
    initiative: number;
    stats: {
        str: number;
        dex: number;
        con: number;
        int: number;
        wis: number;
        cha: number;
    };
    statusEffects: StatusEffect[];
    position?: GridPosition; // Position on battle map (undefined for theatre of mind)
    size: CreatureSize; // D&D 5e creature size
    isPlayer: boolean;
}

export interface StatusEffect {
    name: string;
    description?: string;
    duration?: number;
    concentration?: boolean;
}

// Terrain types for battle maps
export type TerrainType =
    | "Empty" // Normal, passable terrain
    | "Wall" // Impassable, blocks line of sight
    | "DifficultTerrain" // Costs 2 movement to enter (swamps, thick brush, etc.)
    | "Water" // May require swimming
    | "Pit" // Hazardous terrain
    | "Door" // Can be opened/closed
    | "Window" // Blocks movement but not line of sight
    | "Cover" // Provides partial cover (+2 AC, +2 Dex saves)
    | "HeavyCover" // Provides three-quarters cover (+5 AC, +5 Dex saves)
    | "Stairs" // Connects different elevation levels
    | "Hazard"; // Generic hazardous terrain

export const TERRAIN_INFO: Record<
    TerrainType,
    {
        passable: boolean;
        blocksLineOfSight: boolean;
        movementCost: number; // Movement cost multiplier (1 = normal, 2 = difficult)
        coverBonus: number; // AC/Dex save bonus
        description: string;
    }
> = {
    Empty: {
        passable: true,
        blocksLineOfSight: false,
        movementCost: 1,
        coverBonus: 0,
        description: "Open terrain",
    },
    Wall: {
        passable: false,
        blocksLineOfSight: true,
        movementCost: 0,
        coverBonus: 0,
        description: "Solid wall",
    },
    DifficultTerrain: {
        passable: true,
        blocksLineOfSight: false,
        movementCost: 2,
        coverBonus: 0,
        description: "Difficult terrain (costs extra movement)",
    },
    Water: {
        passable: true,
        blocksLineOfSight: false,
        movementCost: 2,
        coverBonus: 0,
        description: "Water (may require swimming)",
    },
    Pit: {
        passable: true,
        blocksLineOfSight: false,
        movementCost: 1,
        coverBonus: 0,
        description: "Pit or hazardous terrain",
    },
    Door: {
        passable: false,
        blocksLineOfSight: true,
        movementCost: 0,
        coverBonus: 0,
        description: "Door (can be opened)",
    },
    Window: {
        passable: false,
        blocksLineOfSight: false,
        movementCost: 0,
        coverBonus: 0,
        description: "Window (blocks movement, not sight)",
    },
    Cover: {
        passable: true,
        blocksLineOfSight: false,
        movementCost: 1,
        coverBonus: 2,
        description: "Half cover (+2 AC/Dex saves)",
    },
    HeavyCover: {
        passable: true,
        blocksLineOfSight: false,
        movementCost: 1,
        coverBonus: 5,
        description: "Three-quarters cover (+5 AC/Dex saves)",
    },
    Stairs: {
        passable: true,
        blocksLineOfSight: false,
        movementCost: 1,
        coverBonus: 0,
        description: "Stairs to different level",
    },
    Hazard: {
        passable: true,
        blocksLineOfSight: false,
        movementCost: 1,
        coverBonus: 0,
        description: "Hazardous terrain",
    },
};

// A single cell on the battle map
export interface MapCell {
    x: number;
    y: number;
    terrain: TerrainType;
    // Optional properties for special terrain
    doorOpen?: boolean; // For doors - whether they're open
    elevation?: number; // Height level (for stairs, platforms)
    hazardDamage?: number; // Damage dealt by hazardous terrain
}

// Battle map configuration
export interface BattleMap {
    width: number; // Map width in grid squares
    height: number; // Map height in grid squares
    cells: MapCell[][]; // 2D array of map cells [y][x]
    description?: string; // Optional description of the map
}

// Battle modes
export type BattleMode = "TheatreOfMind" | "GridBased";

// Campaign system for reusable creatures, maps, and content
export interface CampaignCreature {
    id: string;
    name: string;
    description?: string; // Optional description/notes about this creature
    template: Omit<Creature, "id" | "position">; // Creature template without instance-specific data
    createdAt: number;
    lastUsed?: number;
    usageCount: number;
}

export interface CampaignMap {
    id: string;
    name: string;
    description?: string;
    template: BattleMap;
    createdAt: number;
    lastUsed?: number;
    usageCount: number;
}

export interface Campaign {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean; // Only one default campaign allowed
    creatures: CampaignCreature[];
    maps: CampaignMap[];
    createdAt: number;
    updatedAt: number;
}

export interface CampaignState {
    campaigns: Campaign[];
    defaultCampaignId: string;
}

export interface BattleState {
    id: string;
    name: string;
    creatures: Creature[];
    currentTurn: number;
    round: number;
    isActive: boolean;
    history: BattleAction[];
    mode: BattleMode; // Whether this battle uses a map or theatre of mind
    map?: BattleMap; // Battle map (only present if mode is 'GridBased')
    // Theatre of Mind descriptive texts
    sceneDescription?: string; // Descriptive text of the battlefield/environment
    creaturePositions?: string; // Narrative description of where creatures are positioned
}

export interface BattleAction {
    id: string;
    timestamp: number;
    type: string;
    data: unknown;
    previousState?: Partial<BattleState>;
}

export interface APIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    warnings?: string[];
}

// Strongly typed command definitions
export type BattleCommand =
    | { type: "ADD_CREATURE"; data: Omit<Creature, "id"> }
    | {
          type: "UPDATE_CREATURE";
          data: { creatureId: string; updates: Partial<Creature> };
      }
    | { type: "REMOVE_CREATURE"; data: { creatureId: string } }
    | {
          type: "MOVE_CREATURE";
          data: { creatureId: string; position: GridPosition };
      }
    | { type: "NEXT_TURN"; data: {} }
    | { type: "START_BATTLE"; data: {} }
    | { type: "UNDO"; data: {} }
    | {
          type: "CREATE_BATTLE";
          data: {
              name: string;
              mode?: BattleMode;
              mapSize?: { width: number; height: number };
              sceneDescription?: string;
          };
      }
    | {
          type: "UPDATE_BATTLE";
          data: {
              name?: string;
              mode?: BattleMode;
              mapSize?: { width: number; height: number };
              sceneDescription?: string;
          };
      }
    | {
          type: "SET_TERRAIN";
          data: {
              positions: GridPosition[];
              terrain: TerrainType;
              doorOpen?: boolean;
              elevation?: number;
              hazardDamage?: number;
          };
      }
    | { type: "TOGGLE_DOOR"; data: { position: GridPosition } }
    | { type: "UPDATE_SCENE_DESCRIPTION"; data: { description: string } }
    | { type: "UPDATE_CREATURE_POSITIONS"; data: { positions: string } };

export type CampaignCommand =
    | { type: "CREATE_CAMPAIGN"; data: { name: string; description?: string } }
    | {
          type: "UPDATE_CAMPAIGN";
          data: {
              campaignId: string;
              updates: { name?: string; description?: string };
          };
      }
    | { type: "DELETE_CAMPAIGN"; data: { campaignId: string } }
    | {
          type: "ADD_CREATURE_FROM_CAMPAIGN";
          data: {
              battleId: string;
              campaignCreatureId: string;
              position?: GridPosition;
          };
      }
    | {
          type: "MOVE_CREATURE_TO_CAMPAIGN";
          data: {
              creatureId: string;
              sourceCampaignId: string;
              targetCampaignId: string;
          };
      }
    | {
          type: "MOVE_MAP_TO_CAMPAIGN";
          data: {
              mapId: string;
              sourceCampaignId: string;
              targetCampaignId: string;
          };
      };

export const COMMAND_TYPES = [
    "ADD_CREATURE",
    "UPDATE_CREATURE",
    "REMOVE_CREATURE",
    "MOVE_CREATURE",
    "NEXT_TURN",
    "START_BATTLE",
    "UNDO",
    "CREATE_BATTLE",
    "UPDATE_BATTLE",
    "SET_TERRAIN",
    "TOGGLE_DOOR",
    "UPDATE_SCENE_DESCRIPTION",
    "UPDATE_CREATURE_POSITIONS",
] as const;

export const CAMPAIGN_COMMAND_TYPES = [
    "CREATE_CAMPAIGN",
    "UPDATE_CAMPAIGN",
    "DELETE_CAMPAIGN",
    "ADD_CREATURE_FROM_CAMPAIGN",
    "MOVE_CREATURE_TO_CAMPAIGN",
    "MOVE_MAP_TO_CAMPAIGN",
] as const;

export type CommandType = (typeof COMMAND_TYPES)[number];
export type CampaignCommandType = (typeof CAMPAIGN_COMMAND_TYPES)[number];

// Route configuration that both backend and frontend use
export interface RouteConfig {
    path: string;
    method: string;
    pathParams?: string[];
    bodyExtractor?: string; // How to extract data from request body
    validation?: string[]; // Required fields to validate
}

export const ROUTE_CONFIGS: Record<CommandType, RouteConfig> = {
    ADD_CREATURE: {
        path: "/api/battles/:id/creatures",
        method: "POST",
        pathParams: ["id"],
        bodyExtractor: "body",
        validation: ["name", "hp", "maxHp", "size"],
    },
    UPDATE_CREATURE: {
        path: "/api/battles/:id/creatures/:creatureId",
        method: "PUT",
        pathParams: ["id", "creatureId"],
        bodyExtractor: "body",
    },
    REMOVE_CREATURE: {
        path: "/api/battles/:id/creatures/:creatureId",
        method: "DELETE",
        pathParams: ["id", "creatureId"],
    },
    MOVE_CREATURE: {
        path: "/api/battles/:id/creatures/:creatureId/move",
        method: "POST",
        pathParams: ["id", "creatureId"],
        bodyExtractor: "body",
        validation: ["position"],
    },
    NEXT_TURN: {
        path: "/api/battles/:id/next-turn",
        method: "POST",
        pathParams: ["id"],
    },
    START_BATTLE: {
        path: "/api/battles/:id/start",
        method: "POST",
        pathParams: ["id"],
    },
    UNDO: {
        path: "/api/battles/:id/undo",
        method: "POST",
        pathParams: ["id"],
    },
    CREATE_BATTLE: {
        path: "/api/battles",
        method: "POST",
        bodyExtractor: "body",
        validation: ["name"],
    },
    UPDATE_BATTLE: {
        path: "/api/battles/:id",
        method: "PUT",
        pathParams: ["id"],
        bodyExtractor: "body",
    },
    SET_TERRAIN: {
        path: "/api/battles/:id/map/terrain",
        method: "POST",
        pathParams: ["id"],
        bodyExtractor: "body",
        validation: ["positions", "terrain"],
    },
    TOGGLE_DOOR: {
        path: "/api/battles/:id/map/doors/toggle",
        method: "POST",
        pathParams: ["id"],
        bodyExtractor: "body",
        validation: ["position"],
    },
    UPDATE_SCENE_DESCRIPTION: {
        path: "/api/battles/:id/description",
        method: "PUT",
        pathParams: ["id"],
        bodyExtractor: "body",
        validation: ["description"],
    },
    UPDATE_CREATURE_POSITIONS: {
        path: "/api/battles/:id/positions",
        method: "PUT",
        pathParams: ["id"],
        bodyExtractor: "body",
        validation: ["positions"],
    },
} as const;

export const CAMPAIGN_ROUTE_CONFIGS: Record<CampaignCommandType, RouteConfig> =
    {
        CREATE_CAMPAIGN: {
            path: "/api/campaigns",
            method: "POST",
            bodyExtractor: "body",
            validation: ["name"],
        },
        UPDATE_CAMPAIGN: {
            path: "/api/campaigns/:campaignId",
            method: "PUT",
            pathParams: ["campaignId"],
            bodyExtractor: "body",
        },
        DELETE_CAMPAIGN: {
            path: "/api/campaigns/:campaignId",
            method: "DELETE",
            pathParams: ["campaignId"],
        },
        ADD_CREATURE_FROM_CAMPAIGN: {
            path: "/api/battles/:battleId/creatures/from-campaign/:campaignCreatureId",
            method: "POST",
            pathParams: ["battleId", "campaignCreatureId"],
            bodyExtractor: "body",
        },
        MOVE_CREATURE_TO_CAMPAIGN: {
            path: "/api/campaigns/:sourceCampaignId/creatures/:creatureId/move/:targetCampaignId",
            method: "POST",
            pathParams: ["sourceCampaignId", "creatureId", "targetCampaignId"],
        },
        MOVE_MAP_TO_CAMPAIGN: {
            path: "/api/campaigns/:sourceCampaignId/maps/:mapId/move/:targetCampaignId",
            method: "POST",
            pathParams: ["sourceCampaignId", "mapId", "targetCampaignId"],
        },
    } as const;

// Helper functions for frontend to use ROUTE_CONFIGS
export function getCommandUrl(
    baseUrl: string,
    battleId: string,
    commandType: CommandType,
    data?: any,
): string {
    const config = ROUTE_CONFIGS[commandType];
    let path = config.path;

    // Replace path parameters
    if (config.pathParams?.includes("id")) {
        path = path.replace(":id", battleId);
    }
    if (config.pathParams?.includes("creatureId") && data?.creatureId) {
        path = path.replace(":creatureId", data.creatureId);
    }

    return `${baseUrl}${path}`;
}

export function getCommandMethod(commandType: CommandType): string {
    return ROUTE_CONFIGS[commandType].method;
}

export function buildCommandBody(
    commandType: CommandType,
    data: any,
): string | undefined {
    const config = ROUTE_CONFIGS[commandType];
    if (!config.bodyExtractor) return undefined;

    // Handle different command types
    switch (commandType) {
        case "UPDATE_CREATURE":
            return JSON.stringify(data.updates);
        case "CREATE_BATTLE":
            return JSON.stringify({
                name: data.name,
                mode: data.mode,
                mapSize: data.mapSize,
                sceneDescription: data.sceneDescription,
            });
        case "MOVE_CREATURE":
            return JSON.stringify({ position: data.position });
        case "SET_TERRAIN":
            return JSON.stringify(data);
        case "TOGGLE_DOOR":
            return JSON.stringify({ position: data.position });
        case "UPDATE_SCENE_DESCRIPTION":
            return JSON.stringify({ description: data.description });
        case "UPDATE_CREATURE_POSITIONS":
            return JSON.stringify({ positions: data.positions });
        default:
            return JSON.stringify(data);
    }
}

// Utility functions for map operations

// Create an empty battle map
export function createEmptyMap(
    width: number,
    height: number,
    description?: string,
): BattleMap {
    const cells: MapCell[][] = [];

    for (let y = 0; y < height; y++) {
        cells[y] = [];
        for (let x = 0; x < width; x++) {
            cells[y][x] = {
                x,
                y,
                terrain: "Empty",
            };
        }
    }

    return {
        width,
        height,
        cells,
        description,
    };
}

// Check if a position is valid on the map
export function isValidPosition(
    map: BattleMap,
    position: GridPosition,
): boolean {
    return (
        position.x >= 0 &&
        position.x < map.width &&
        position.y >= 0 &&
        position.y < map.height
    );
}

// Get the map cell at a position
export function getMapCell(
    map: BattleMap,
    position: GridPosition,
): MapCell | null {
    if (!isValidPosition(map, position)) return null;
    return map.cells[position.y][position.x];
}

// Check if a creature can occupy a position (considering size)
export function canCreatureOccupyPosition(
    map: BattleMap,
    position: GridPosition,
    creatureSize: CreatureSize,
    excludeCreatureId?: string,
    existingCreatures?: Creature[],
): { canOccupy: boolean; reason?: string } {
    const sizeInfo = CREATURE_SIZE_INFO[creatureSize];
    const gridSize = sizeInfo.gridSize;

    // Check if all required squares are within map bounds
    for (let dy = 0; dy < gridSize; dy++) {
        for (let dx = 0; dx < gridSize; dx++) {
            const checkPos = { x: position.x + dx, y: position.y + dy };

            if (!isValidPosition(map, checkPos)) {
                return {
                    canOccupy: false,
                    reason: "Position extends beyond map bounds",
                };
            }

            const cell = getMapCell(map, checkPos);
            if (!cell) continue;

            // Check if terrain is passable
            if (!TERRAIN_INFO[cell.terrain].passable) {
                return {
                    canOccupy: false,
                    reason: `Blocked by ${cell.terrain.toLowerCase()}`,
                };
            }

            // Check for other creatures occupying the space
            if (existingCreatures) {
                const blockingCreature = existingCreatures.find((creature) => {
                    if (creature.id === excludeCreatureId) return false;
                    if (!creature.position) return false;

                    const otherSizeInfo = CREATURE_SIZE_INFO[creature.size];
                    const otherGridSize = otherSizeInfo.gridSize;

                    // Check if this creature occupies any of the squares we need
                    for (let ody = 0; ody < otherGridSize; ody++) {
                        for (let odx = 0; odx < otherGridSize; odx++) {
                            const occupiedPos = {
                                x: creature.position.x + odx,
                                y: creature.position.y + ody,
                            };
                            if (
                                occupiedPos.x === checkPos.x &&
                                occupiedPos.y === checkPos.y
                            ) {
                                return true;
                            }
                        }
                    }
                    return false;
                });

                if (blockingCreature) {
                    return {
                        canOccupy: false,
                        reason: `Blocked by ${blockingCreature.name}`,
                    };
                }
            }
        }
    }

    return { canOccupy: true };
}

// Calculate distance between two positions (in grid squares)
export function calculateDistance(
    pos1: GridPosition,
    pos2: GridPosition,
): number {
    // Use diagonal distance (allows diagonal movement)
    return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y));
}

// Check if there's line of sight between two positions
export function hasLineOfSight(
    map: BattleMap,
    from: GridPosition,
    to: GridPosition,
): boolean {
    // Simple line of sight algorithm using Bresenham's line
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const sx = from.x < to.x ? 1 : -1;
    const sy = from.y < to.y ? 1 : -1;
    let err = dx - dy;

    let x = from.x;
    let y = from.y;

    while (true) {
        // Check if current position blocks line of sight
        const cell = getMapCell(map, { x, y });
        if (cell && TERRAIN_INFO[cell.terrain].blocksLineOfSight) {
            // Don't block if we're at the starting position
            if (x !== from.x || y !== from.y) {
                return false;
            }
        }

        // Reached the target
        if (x === to.x && y === to.y) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }

    return true;
}
