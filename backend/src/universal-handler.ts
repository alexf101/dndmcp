import { BattleStore } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";
import type { DiceStore } from "./dice-store.ts";
import type {
    CommandType,
    CampaignCommandType,
    BattleState,
    Campaign,
    CampaignCreature,
    ROUTE_CONFIGS,
    CAMPAIGN_ROUTE_CONFIGS,
} from "../../shared/types.ts";
import { ImpossibleCommandError } from "./errors.ts";
import { rollDice } from "./dice-roller.ts";
import { Open5eApi } from "./open5e-api.ts";

// Result type for universal handler
export interface HandlerResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

// Universal handler that works for both REST and MCP
export class UniversalHandler {
    constructor(
        private battleStore: BattleStore,
        private campaignStore: CampaignStore,
        private diceStore?: DiceStore,
    ) {}

    // Main dispatch method
    async handle(
        commandType: CommandType | CampaignCommandType | string,
        args: Record<string, unknown>,
    ): Promise<HandlerResult> {
        console.error(`Handling command: ${commandType} with args:`, args);
        try {
            switch (commandType) {
                // Battle management
                case "ADD_CREATURE": {
                    const { battleId, creature } = args as {
                        battleId: string;
                        creature: unknown;
                    };
                    const result = this.battleStore.addCreature(
                        battleId,
                        creature,
                    );
                    return result
                        ? { success: true, data: result }
                        : { success: false, error: "Battle not found" };
                }

                case "UPDATE_CREATURE": {
                    const { battleId, creatureId, updates } = args as {
                        battleId: string;
                        creatureId: string;
                        updates: unknown;
                    };
                    const result = this.battleStore.updateCreature(
                        battleId,
                        creatureId,
                        updates,
                    );
                    return result
                        ? { success: true, data: result }
                        : {
                              success: false,
                              error: "Battle or creature not found",
                          };
                }

                case "REMOVE_CREATURE": {
                    const { battleId, creatureId } = args as {
                        battleId: string;
                        creatureId: string;
                    };
                    const result = this.battleStore.removeCreature(
                        battleId,
                        creatureId,
                    );
                    return result
                        ? { success: true, data: result }
                        : {
                              success: false,
                              error: "Battle or creature not found",
                          };
                }

                case "MOVE_CREATURE": {
                    const { battleId, creatureId, position } = args as {
                        battleId: string;
                        creatureId: string;
                        position: { x: number; y: number };
                    };
                    const result = this.battleStore.moveCreature(
                        battleId,
                        creatureId,
                        position,
                    );
                    return result
                        ? { success: true, data: result }
                        : {
                              success: false,
                              error: "Battle or creature not found",
                          };
                }

                case "NEXT_TURN": {
                    const { battleId } = args as { battleId: string };
                    const result = this.battleStore.nextTurn(battleId);
                    return result
                        ? { success: true, data: result }
                        : { success: false, error: "Battle not found" };
                }

                case "START_BATTLE": {
                    const { battleId } = args as { battleId: string };
                    const result = this.battleStore.startBattle(battleId);
                    return result
                        ? { success: true, data: result }
                        : { success: false, error: "Battle not found" };
                }

                case "UNDO": {
                    const { battleId } = args as { battleId: string };
                    const result = this.battleStore.undo(battleId);
                    return result
                        ? { success: true, data: result }
                        : {
                              success: false,
                              error: "Battle not found or no actions to undo",
                          };
                }

                case "CREATE_BATTLE": {
                    const { name, mode, mapSize, sceneDescription } = args as {
                        name: string;
                        mode?: string;
                        mapSize?: { width: number; height: number };
                        sceneDescription?: string;
                    };
                    const result = this.battleStore.createBattle(
                        name,
                        mode,
                        mapSize,
                        sceneDescription,
                    );
                    return { success: true, data: result };
                }

                case "UPDATE_BATTLE": {
                    const { battleId, name, mode, mapSize, sceneDescription } =
                        args as {
                            battleId: string;
                            name?: string;
                            mode?: string;
                            mapSize?: { width: number; height: number };
                            sceneDescription?: string;
                        };
                    const result = this.battleStore.updateBattle(battleId, {
                        name,
                        mode,
                        mapSize,
                        sceneDescription,
                    });
                    return result
                        ? { success: true, data: result }
                        : { success: false, error: "Battle not found" };
                }

                case "SET_TERRAIN": {
                    const { battleId, positions, terrain } = args as {
                        battleId: string;
                        positions: Array<{ x: number; y: number }>;
                        terrain: string;
                    };
                    const result = this.battleStore.setTerrain(
                        battleId,
                        positions,
                        terrain,
                    );
                    return result
                        ? { success: true, data: result }
                        : {
                              success: false,
                              error: "Battle not found or not grid-based",
                          };
                }

                case "TOGGLE_DOOR": {
                    const { battleId, position } = args as {
                        battleId: string;
                        position: { x: number; y: number };
                    };
                    const result = this.battleStore.toggleDoor(
                        battleId,
                        position,
                    );
                    return result
                        ? { success: true, data: result }
                        : {
                              success: false,
                              error: "Battle not found or position not a door",
                          };
                }

                case "UPDATE_SCENE_DESCRIPTION": {
                    const { battleId, description } = args as {
                        battleId: string;
                        description: string;
                    };
                    const result = this.battleStore.updateSceneDescription(
                        battleId,
                        description,
                    );
                    return result
                        ? { success: true, data: result }
                        : { success: false, error: "Battle not found" };
                }

                case "UPDATE_CREATURE_POSITIONS": {
                    const { battleId, positions } = args as {
                        battleId: string;
                        positions: string;
                    };
                    const result = this.battleStore.updateCreaturePositions(
                        battleId,
                        positions,
                    );
                    return result
                        ? { success: true, data: result }
                        : { success: false, error: "Battle not found" };
                }

                // Battle queries
                case "LIST_BATTLES": {
                    const battles = this.battleStore.getAllBattles();
                    return { success: true, data: battles };
                }

                case "GET_BATTLE": {
                    const { battleId } = args as { battleId: string };
                    const battle = this.battleStore.getBattle(battleId);
                    return battle
                        ? { success: true, data: battle }
                        : { success: false, error: "Battle not found" };
                }

                // Campaign management
                case "CREATE_CAMPAIGN": {
                    const { name, description } = args as {
                        name: string;
                        description?: string;
                    };
                    const campaign = this.campaignStore.createCampaign(
                        name,
                        description,
                    );
                    return { success: true, data: campaign };
                }

                case "UPDATE_CAMPAIGN": {
                    const { campaignId, name, description } = args as {
                        campaignId: string;
                        name?: string;
                        description?: string;
                    };
                    const campaign = this.campaignStore.updateCampaign(
                        campaignId,
                        {
                            name,
                            description,
                        },
                    );
                    return campaign
                        ? { success: true, data: campaign }
                        : { success: false, error: "Campaign not found" };
                }

                case "DELETE_CAMPAIGN": {
                    const { campaignId } = args as { campaignId: string };
                    const success =
                        this.campaignStore.deleteCampaign(campaignId);
                    return success
                        ? { success: true }
                        : {
                              success: false,
                              error: "Campaign not found or cannot delete default campaign",
                          };
                }

                case "ADD_CREATURE_FROM_CAMPAIGN": {
                    const { battleId, campaignCreatureId, position } = args as {
                        battleId: string;
                        campaignCreatureId: string;
                        position?: { x: number; y: number };
                    };
                    const battle = this.battleStore.addCreatureFromCampaign(
                        battleId,
                        campaignCreatureId,
                        position,
                    );
                    return battle
                        ? { success: true, data: battle }
                        : {
                              success: false,
                              error: "Battle or campaign creature not found",
                          };
                }

                case "MOVE_CREATURE_TO_CAMPAIGN": {
                    const { creatureId, sourceCampaignId, targetCampaignId } =
                        args as {
                            creatureId: string;
                            sourceCampaignId: string;
                            targetCampaignId: string;
                        };
                    const success = this.campaignStore.moveCreatureToCampaign(
                        creatureId,
                        sourceCampaignId,
                        targetCampaignId,
                    );
                    return success
                        ? { success: true }
                        : {
                              success: false,
                              error: "Creature or campaigns not found",
                          };
                }

                case "MOVE_MAP_TO_CAMPAIGN": {
                    const { mapId, sourceCampaignId, targetCampaignId } =
                        args as {
                            mapId: string;
                            sourceCampaignId: string;
                            targetCampaignId: string;
                        };
                    const success = this.campaignStore.moveMapToCampaign(
                        mapId,
                        sourceCampaignId,
                        targetCampaignId,
                    );
                    return success
                        ? { success: true }
                        : {
                              success: false,
                              error: "Map or campaigns not found",
                          };
                }

                // Campaign queries
                case "LIST_CAMPAIGNS": {
                    const campaigns = this.campaignStore.getAllCampaigns();
                    return { success: true, data: campaigns };
                }

                case "SEARCH_CAMPAIGN_CREATURES": {
                    const { query, campaignId } = args as {
                        query: string;
                        campaignId?: string;
                    };
                    const creatures = this.campaignStore.searchCreatures(
                        query,
                        campaignId,
                    );
                    return { success: true, data: creatures };
                }

                // DnD utilities
                case "OPEN5E_SCHEMA": {
                    // Return the Open5e API schema as-is; it's saved locally as open_5e_v1.yaml
                    // See: https://api.open5e.com/schema to get the latest version
                    const schema = Open5eApi.getSchema();
                    return { success: true, data: schema };
                }
                case "OPEN5E_LOOKUP": {
                    // In addition to the functionality we implement locally, we also proxy
                    // requests to the Open5e API for creature lookups. We directly pass through
                    // an HTTP request intended for the Open5e API; we don't try and interpret the
                    // request or response in order to avoid duplicating their API here. However,
                    // there is a simple pattern for accessing Open5e data that we encode here:
                    // - the API always uses GET requests, so we don't specify the method here
                    // - all requests are to the base URL "https://api.open5e.com/v2/"
                    // - the "path" parameter specifies the endpoint, e.g. "/monsters"
                    // - the API extensively uses query parameters for filtering, pagination, etc. We make page an explicit parameter
                    //   and allow any other query parameters to be passed in via "queryParams" object.
                    // - routes always end in slash, and this isn't optional.
                    // See: https://api.open5e.com/schema/redoc/
                    // Example request:
                    // {
                    //   "jsonrpc": "2.0",
                    //   "id": 1,
                    //   "method": "tools/call",
                    //   "params": {
                    //     "name": "open5e_lookup",
                    //     "arguments": {
                    //         "path": "/items/", // (trailing slash will be added if missing)
                    //         "page": 1,
                    //         "queryParams": {
                    //             "name__icontains": "necklace"
                    //         }
                    //     }
                    //   }
                    // }
                    const request = args as {
                        path: string;
                        page?: number;
                        queryParams?: Record<string, string | number>;
                    };
                    const path: string = request.path;
                    const page: number = request.page || 1;
                    const queryParams: Record<string, string | number> =
                        (args.queryParams as Record<string, string | number>) ||
                        ({} as Record<string, string | number>);

                    let response: object;
                    try {
                        response = await Open5eApi.lookup(path, {
                            page,
                            ...queryParams,
                        });
                    } catch (error) {
                        return {
                            success: false,
                            error: `Open5e API error: ${
                                (error as Error).message
                            }`,
                        };
                    }
                    // Return the Open5e API response directly as the result
                    return {
                        success: true,
                        data: response,
                    };
                }

                // Dice rolling
                case "ROLL_DICE": {
                    const {
                        dice,
                        modifier = 0,
                        description,
                    } = args as {
                        dice: string;
                        modifier?: number;
                        description?: string;
                    };
                    try {
                        const result = rollDice(dice, modifier, description);
                        // Add to history and broadcast if diceStore is available
                        if (this.diceStore) {
                            this.diceStore.addRoll(result);
                        }
                        return { success: true, data: result };
                    } catch (error) {
                        return {
                            success: false,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : "Invalid dice notation",
                        };
                    }
                }

                default:
                    return {
                        success: false,
                        error: `Unknown command: ${commandType}`,
                    };
            }
        } catch (error) {
            if (error instanceof ImpossibleCommandError) {
                return {
                    success: false,
                    error: `Impossible command: ${error.message}`,
                };
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    // Helper method to convert route config + arguments to handler arguments
    convertRESTToHandlerArgs(
        commandType: CommandType | CampaignCommandType,
        pathParams: string[],
        bodyData: unknown,
    ): Record<string, unknown> {
        const args: Record<string, unknown> = {};

        // Get route config
        const config =
            (ROUTE_CONFIGS as Record<string, unknown>)[commandType] ||
            (CAMPAIGN_ROUTE_CONFIGS as Record<string, unknown>)[commandType];

        if (!config) {
            return args;
        }

        const routeConfig = config as { pathParams?: string[] };

        // Add path parameters
        if (routeConfig.pathParams) {
            routeConfig.pathParams.forEach((paramName, index) => {
                let argName = paramName;
                if (paramName === "id") argName = "battleId"; // Convert 'id' to 'battleId' for consistency
                args[argName] = pathParams[index];
            });
        }

        // Add body data
        if (bodyData && typeof bodyData === "object") {
            Object.assign(args, bodyData);
        }

        return args;
    }
}

// Factory function for creating the universal handler
export function createUniversalHandler(
    battleStore: BattleStore,
    campaignStore: CampaignStore,
    diceStore?: DiceStore,
): UniversalHandler {
    return new UniversalHandler(battleStore, campaignStore, diceStore);
}
