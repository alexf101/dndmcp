/**
 * MCP Server HTTP Transport Handler
 * Implements Model Context Protocol JSON-RPC over HTTP
 */

import { Context } from "@oak/oak";
import { BattleStore } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";
import { DiceStore } from "./dice-store.ts";
import { createUniversalHandler } from "./universal-handler.ts";
import {
    generateAllMCPTools,
    generateToolCommandMapping,
} from "./mcp-generator.ts";
import { logger } from "./logger.ts";

// Generate MCP tools from route configurations
const TOOLS = generateAllMCPTools();
const TOOL_COMMAND_MAPPING = generateToolCommandMapping();

interface JSONRPCRequest {
    jsonrpc: string;
    id: number | string;
    method: string;
    params?: any;
}

interface JSONRPCResponse {
    jsonrpc: string;
    id: number | string;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

export function createMCPHttpHandler(
    battleStore: BattleStore,
    campaignStore: CampaignStore,
    diceStore: DiceStore,
) {
    const handler = createUniversalHandler(battleStore, campaignStore, diceStore);

    return async (ctx: Context) => {
        try {
            const body = await ctx.request.body.json();
            const request: JSONRPCRequest = body;

            logger.debug(`MCP HTTP Request: ${request.method}`, request.params);

            // Handle MCP protocol methods
            if (request.method === "tools/list") {
                const response: JSONRPCResponse = {
                    jsonrpc: "2.0",
                    id: request.id,
                    result: {
                        tools: TOOLS,
                    },
                };
                ctx.response.body = response;
                return;
            }

            if (request.method === "tools/call") {
                const { name, arguments: args } = request.params;

                // Get command type from tool name
                const commandType = TOOL_COMMAND_MAPPING[name];
                if (!commandType) {
                    const response: JSONRPCResponse = {
                        jsonrpc: "2.0",
                        id: request.id,
                        error: {
                            code: -32601,
                            message: `Unknown tool: ${name}`,
                        },
                    };
                    ctx.response.status = 400;
                    ctx.response.body = response;
                    return;
                }

                // Handle the request using universal handler
                const result = await handler.handle(commandType, args || {});

                if (!result.success) {
                    const response: JSONRPCResponse = {
                        jsonrpc: "2.0",
                        id: request.id,
                        error: {
                            code: -32000,
                            message: result.error || "Unknown error",
                        },
                    };
                    ctx.response.status = 400;
                    ctx.response.body = response;
                    return;
                }

                // Format success response based on command type
                const responseText = formatMCPToolResponse(commandType, result.data, args);

                const response: JSONRPCResponse = {
                    jsonrpc: "2.0",
                    id: request.id,
                    result: {
                        content: [
                            {
                                type: "text",
                                text: responseText,
                            },
                        ],
                    },
                };
                ctx.response.body = response;
                return;
            }

            // Unknown method
            const response: JSONRPCResponse = {
                jsonrpc: "2.0",
                id: request.id,
                error: {
                    code: -32601,
                    message: `Method not found: ${request.method}`,
                },
            };
            ctx.response.status = 404;
            ctx.response.body = response;
        } catch (error) {
            logger.error("MCP HTTP handler error:", error);
            const response: JSONRPCResponse = {
                jsonrpc: "2.0",
                id: 0,
                error: {
                    code: -32700,
                    message: error instanceof Error ? error.message : String(error),
                },
            };
            ctx.response.status = 500;
            ctx.response.body = response;
        }
    };
}

/**
 * Format MCP tool response text (same logic as stdio MCP server)
 */
function formatMCPToolResponse(commandType: string, data: any, args: any): string {
    switch (commandType) {
        case "CREATE_BATTLE": {
            const battle = data;
            return `Created battle "${battle.name}" (${battle.mode}) with ID: ${battle.id}`;
        }

        case "LIST_BATTLES": {
            const battles = data as any[];
            const battleList = battles
                .map(
                    (b) =>
                        `- ${b.name} (${b.mode}) - ${b.creatures.length} creatures - Status: ${b.status}`,
                )
                .join("\n");
            return `Current battles:\n${battleList || "No battles found"}`;
        }

        case "GET_BATTLE": {
            return JSON.stringify(data, null, 2);
        }

        case "ADD_CREATURE": {
            const battle = data;
            return `Added creature to battle "${battle.name}"`;
        }

        case "UPDATE_CREATURE": {
            const battle = data;
            return `Updated creature in battle "${battle.name}"`;
        }

        case "REMOVE_CREATURE": {
            const battle = data;
            return `Removed creature from battle "${battle.name}"`;
        }

        case "MOVE_CREATURE": {
            const battle = data;
            const pos = args.position;
            return `Moved creature to position (${pos.x}, ${pos.y}) in battle "${battle.name}"`;
        }

        case "START_BATTLE": {
            const battle = data;
            return `Started battle "${battle.name}" - initiative rolled and turn order established`;
        }

        case "NEXT_TURN": {
            const battle = data;
            const currentCreature = battle.creatures[battle.currentTurn];
            return `Advanced to next turn in "${battle.name}" - now ${
                currentCreature?.name || "unknown"
            }'s turn (round ${battle.round})`;
        }

        case "SET_TERRAIN": {
            const battle = data;
            const positions = args.positions as any[];
            const terrain = args.terrain;
            return `Set ${positions.length} cells to ${terrain} in battle "${battle.name}"`;
        }

        case "TOGGLE_DOOR": {
            const battle = data;
            const pos = args.position;
            return `Toggled door at (${pos.x}, ${pos.y}) in battle "${battle.name}"`;
        }

        case "UNDO": {
            const battle = data;
            return `Undid last action in battle "${battle.name}"`;
        }

        case "LIST_CAMPAIGNS": {
            const campaigns = data as any[];
            const campaignList = campaigns
                .map(
                    (c) =>
                        `- ${c.name}${c.isDefault ? " (Default)" : ""} - ${
                            c.creatures.length
                        } creatures, ${c.maps.length} maps`,
                )
                .join("\n");
            return `Current campaigns:\n${campaignList || "No campaigns found"}`;
        }

        case "CREATE_CAMPAIGN": {
            const campaign = data;
            return `Created campaign "${campaign.name}" with ID: ${campaign.id}`;
        }

        case "SEARCH_CAMPAIGN_CREATURES": {
            const creatures = data as any[];
            const creatureList = creatures
                .map(
                    (c) =>
                        `- ${c.name} (${c.template.size}, AC ${c.template.ac}, HP ${c.template.maxHp}) - Used ${c.usageCount} times`,
                )
                .join("\n");
            return `Found ${creatures.length} creatures:\n${
                creatureList || "No creatures found"
            }`;
        }

        case "ADD_CREATURE_FROM_CAMPAIGN": {
            const battle = data;
            return `Added creature from campaign template to battle "${battle.name}"`;
        }

        case "ROLL_DICE": {
            const roll = data;
            const rollDetails = roll.rolls.length > 1
                ? ` (${roll.rolls.join(", ")})`
                : "";
            const modifierText = roll.modifier !== 0
                ? ` with modifier ${roll.modifier >= 0 ? "+" : ""}${roll.modifier}`
                : "";
            const descriptionText = roll.description ? `**${roll.description}**\n` : "";
            return `${descriptionText}🎲 Rolled ${roll.notation}${rollDetails}${modifierText}\n**Total: ${roll.total}**`;
        }

        default: {
            return data ? JSON.stringify(data, null, 2) : "Operation completed successfully";
        }
    }
}
