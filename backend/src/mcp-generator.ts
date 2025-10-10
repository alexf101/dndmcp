import {
    ROUTE_CONFIGS,
    CAMPAIGN_ROUTE_CONFIGS,
    CommandType,
    CampaignCommandType,
    RouteConfig,
    TerrainType,
    CreatureSize,
    BattleMode,
} from "../../shared/types.ts";

// MCP Tool Definition Interface
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: Record<string, unknown>;
        required: string[];
        additionalProperties?: boolean;
    };
}

// Schema definitions for common D&D types
const SCHEMAS = {
    battleId: {
        type: "string",
        description: "ID of the battle",
    },
    creatureId: {
        type: "string",
        description: "ID of the creature",
    },
    campaignId: {
        type: "string",
        description: "ID of the campaign",
    },
    campaignCreatureId: {
        type: "string",
        description: "ID of the campaign creature template",
    },
    name: {
        type: "string",
        description: "Name",
    },
    description: {
        type: "string",
        description: "Description",
    },
    position: {
        type: "object",
        properties: {
            x: { type: "number", description: "X coordinate" },
            y: { type: "number", description: "Y coordinate" },
        },
        required: ["x", "y"],
        description: "Grid position",
    },
    positions: {
        type: "array",
        items: {
            type: "object",
            properties: {
                x: { type: "number" },
                y: { type: "number" },
            },
            required: ["x", "y"],
        },
        description: "Array of grid positions",
    },
    terrain: {
        type: "string",
        enum: [
            "Empty", "Wall", "DifficultTerrain", "Water", "Pit",
            "Door", "Window", "Cover", "HeavyCover", "Stairs", "Hazard"
        ] as TerrainType[],
        description: "Type of terrain",
    },
    mode: {
        type: "string",
        enum: ["GridBased", "TheatreOfMind"] as BattleMode[],
        description: "Battle mode",
    },
    mapSize: {
        type: "object",
        properties: {
            width: { type: "number", description: "Map width in grid squares" },
            height: { type: "number", description: "Map height in grid squares" },
        },
        required: ["width", "height"],
        description: "Map dimensions",
    },
    sceneDescription: {
        type: "string",
        description: "Description of the battle scene",
    },
    creature: {
        type: "object",
        properties: {
            name: { type: "string", description: "Creature name" },
            hp: { type: "number", description: "Current hit points" },
            maxHp: { type: "number", description: "Maximum hit points" },
            ac: { type: "number", description: "Armor class" },
            initiative: { type: "number", description: "Initiative modifier" },
            stats: {
                type: "object",
                properties: {
                    str: { type: "number" },
                    dex: { type: "number" },
                    con: { type: "number" },
                    int: { type: "number" },
                    wis: { type: "number" },
                    cha: { type: "number" },
                },
                required: ["str", "dex", "con", "int", "wis", "cha"],
                description: "Ability scores",
            },
            size: {
                type: "string",
                enum: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"] as CreatureSize[],
                description: "Creature size",
            },
            isPlayer: { type: "boolean", description: "Whether this is a player character" },
            position: {
                type: "object",
                properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                },
                description: "Grid position (for GridBased battles)",
            },
            statusEffects: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        duration: { type: "number" },
                    },
                },
                description: "Active status effects",
            },
        },
        required: ["name", "hp", "maxHp", "ac", "initiative", "stats", "size", "isPlayer"],
        description: "Creature data",
    },
    updates: {
        type: "object",
        properties: {
            hp: { type: "number" },
            maxHp: { type: "number" },
            ac: { type: "number" },
            initiative: { type: "number" },
            position: {
                type: "object",
                properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                },
            },
            statusEffects: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        duration: { type: "number" },
                    },
                },
            },
        },
        description: "Fields to update",
    },
} as const;

// Command descriptions for better MCP tool names and descriptions
const COMMAND_DESCRIPTIONS: Record<CommandType | CampaignCommandType, { name: string; description: string }> = {
    ADD_CREATURE: {
        name: "add_creature",
        description: "Add a creature to a battle with stats, position, etc.",
    },
    UPDATE_CREATURE: {
        name: "update_creature",
        description: "Update creature properties (HP, status effects, position)",
    },
    REMOVE_CREATURE: {
        name: "remove_creature",
        description: "Remove a creature from a battle",
    },
    MOVE_CREATURE: {
        name: "move_creature",
        description: "Move a creature to a new position on the battle map",
    },
    NEXT_TURN: {
        name: "next_turn",
        description: "Advance to the next turn in the battle",
    },
    START_BATTLE: {
        name: "start_battle",
        description: "Start a battle (roll initiative and begin turn order)",
    },
    UNDO: {
        name: "undo_action",
        description: "Undo the last action performed in the battle",
    },
    CREATE_BATTLE: {
        name: "create_battle",
        description: "Create a new battle (GridBased or TheatreOfMind)",
    },
    UPDATE_BATTLE: {
        name: "update_battle",
        description: "Update battle properties",
    },
    SET_TERRAIN: {
        name: "set_terrain",
        description: "Set terrain type for specific positions on the battle map",
    },
    TOGGLE_DOOR: {
        name: "toggle_door",
        description: "Toggle a door between open and closed states",
    },
    UPDATE_SCENE_DESCRIPTION: {
        name: "update_scene_description",
        description: "Update the battle scene description",
    },
    UPDATE_CREATURE_POSITIONS: {
        name: "update_creature_positions",
        description: "Update narrative creature positions (TheatreOfMind)",
    },
    CREATE_CAMPAIGN: {
        name: "create_campaign",
        description: "Create a new campaign",
    },
    UPDATE_CAMPAIGN: {
        name: "update_campaign",
        description: "Update campaign properties",
    },
    DELETE_CAMPAIGN: {
        name: "delete_campaign",
        description: "Delete a campaign",
    },
    ADD_CREATURE_FROM_CAMPAIGN: {
        name: "add_creature_from_campaign",
        description: "Add a creature from a campaign template to a battle",
    },
    MOVE_CREATURE_TO_CAMPAIGN: {
        name: "move_creature_to_campaign",
        description: "Move a creature from one campaign to another",
    },
    MOVE_MAP_TO_CAMPAIGN: {
        name: "move_map_to_campaign",
        description: "Move a map from one campaign to another",
    },
};

// Map path parameter names to schema properties
function getPathParamSchema(paramName: string): Record<string, unknown> {
    if (paramName === "id") return SCHEMAS.battleId;
    if (paramName === "creatureId") return SCHEMAS.creatureId;
    if (paramName === "campaignId") return SCHEMAS.campaignId;
    if (paramName === "campaignCreatureId") return SCHEMAS.campaignCreatureId;

    // Default string parameter
    return {
        type: "string",
        description: `${paramName} parameter`,
    };
}

// Map validation field names to schema properties
function getValidationSchema(fieldName: string): Record<string, unknown> {
    if (fieldName in SCHEMAS) {
        return SCHEMAS[fieldName as keyof typeof SCHEMAS];
    }

    // Default string field
    return {
        type: "string",
        description: `${fieldName} field`,
    };
}

// Generate MCP tool from route config
function generateMCPTool(commandType: CommandType | CampaignCommandType, config: RouteConfig): MCPTool {
    const { name, description } = COMMAND_DESCRIPTIONS[commandType];

    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    // Add path parameters
    if (config.pathParams) {
        for (const param of config.pathParams) {
            // Map common parameter names to friendlier MCP argument names
            let mcpParamName = param;
            if (param === "id") mcpParamName = "battleId";

            properties[mcpParamName] = getPathParamSchema(param);
            required.push(mcpParamName);
        }
    }

    // Add body parameters
    if (config.bodyExtractor === "body") {
        // For CREATE_BATTLE, add specific battle creation fields
        if (commandType === "CREATE_BATTLE") {
            properties.name = SCHEMAS.name;
            properties.mode = SCHEMAS.mode;
            properties.mapSize = SCHEMAS.mapSize;
            properties.sceneDescription = SCHEMAS.sceneDescription;
        }
        // For UPDATE_BATTLE, add update fields
        else if (commandType === "UPDATE_BATTLE") {
            properties.name = SCHEMAS.name;
            properties.mode = SCHEMAS.mode;
            properties.mapSize = SCHEMAS.mapSize;
            properties.sceneDescription = SCHEMAS.sceneDescription;
        }
        // For ADD_CREATURE, add creature object
        else if (commandType === "ADD_CREATURE") {
            properties.creature = SCHEMAS.creature;
        }
        // For UPDATE_CREATURE, add updates object
        else if (commandType === "UPDATE_CREATURE") {
            properties.updates = SCHEMAS.updates;
        }
        // For other commands, add validated fields directly
        else if (config.validation) {
            for (const field of config.validation) {
                properties[field] = getValidationSchema(field);
            }
        }
    }

    // Add required fields from validation
    if (config.validation) {
        required.push(...config.validation);
    }

    return {
        name,
        description,
        inputSchema: {
            type: "object",
            properties,
            required,
            additionalProperties: false,
        },
    };
}

// Generate all MCP tools from route configs
export function generateAllMCPTools(): MCPTool[] {
    const tools: MCPTool[] = [];

    // Generate battle management tools
    for (const [commandType, config] of Object.entries(ROUTE_CONFIGS)) {
        tools.push(generateMCPTool(commandType as CommandType, config));
    }

    // Generate campaign management tools
    for (const [commandType, config] of Object.entries(CAMPAIGN_ROUTE_CONFIGS)) {
        tools.push(generateMCPTool(commandType as CampaignCommandType, config));
    }

    // Add additional tools that don't have REST equivalents
    tools.push({
        name: "list_battles",
        description: "Get all existing battles",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
        },
    });

    tools.push({
        name: "get_battle",
        description: "Get detailed information about a specific battle",
        inputSchema: {
            type: "object",
            properties: {
                battleId: SCHEMAS.battleId,
            },
            required: ["battleId"],
            additionalProperties: false,
        },
    });

    tools.push({
        name: "list_campaigns",
        description: "Get all campaigns",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
        },
    });

    tools.push({
        name: "search_campaign_creatures",
        description: "Search for creatures in campaigns",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query",
                },
                campaignId: {
                    type: "string",
                    description: "Optional campaign ID to limit search",
                },
            },
            required: ["query"],
            additionalProperties: false,
        },
    });

    return tools;
}

// Generate mapping from MCP tool name to command type for the handler
export function generateToolCommandMapping(): Record<string, CommandType | CampaignCommandType | string> {
    const mapping: Record<string, CommandType | CampaignCommandType | string> = {};

    // Map battle commands
    for (const commandType of Object.keys(ROUTE_CONFIGS) as CommandType[]) {
        const toolName = COMMAND_DESCRIPTIONS[commandType].name;
        mapping[toolName] = commandType;
    }

    // Map campaign commands
    for (const commandType of Object.keys(CAMPAIGN_ROUTE_CONFIGS) as CampaignCommandType[]) {
        const toolName = COMMAND_DESCRIPTIONS[commandType].name;
        mapping[toolName] = commandType;
    }

    // Map special tools
    mapping["list_battles"] = "LIST_BATTLES";
    mapping["get_battle"] = "GET_BATTLE";
    mapping["list_campaigns"] = "LIST_CAMPAIGNS";
    mapping["search_campaign_creatures"] = "SEARCH_CAMPAIGN_CREATURES";

    return mapping;
}