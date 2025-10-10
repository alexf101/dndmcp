#!/usr/bin/env -S deno run --allow-all

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { BattleStore } from "./backend/src/battle-store.ts";
import { CampaignStore } from "./backend/src/campaign-store.ts";
import { DiceStore } from "./backend/src/dice-store.ts";
import {
    generateAllMCPTools,
    generateToolCommandMapping,
} from "./backend/src/mcp-generator.ts";
import { createUniversalHandler } from "./backend/src/universal-handler.ts";
import { logger } from "./backend/src/logger.ts";

// Initialize stores
const campaignStore = new CampaignStore();
const battleStore = new BattleStore(campaignStore);
const diceStore = new DiceStore();

// Create universal handler
const handler = createUniversalHandler(battleStore, campaignStore, diceStore);

// Generate tools from route configurations
const TOOLS = generateAllMCPTools();
const TOOL_COMMAND_MAPPING = generateToolCommandMapping();

// Create MCP server
const server = new Server(
    {
        name: "dnd-battle-manager",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

// Register tools (generated from route configs)
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: TOOLS,
    };
});

// Handle tool calls using universal handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        // Get command type from tool name
        const commandType = TOOL_COMMAND_MAPPING[name];
        if (!commandType) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Unknown tool: ${name}`,
                    },
                ],
                isError: true,
            };
        }

        // Handle the request using universal handler
        const result = await handler.handle(commandType, args || {});

        if (!result.success) {
            return {
                content: [
                    {
                        type: "text",
                        text: result.error || "Unknown error",
                    },
                ],
                isError: true,
            };
        }

        // Format success response based on command type
        let responseText: string;

        switch (commandType) {
            case "CREATE_BATTLE": {
                const battle = result.data as any;
                responseText = `Created battle "${battle.name}" (${battle.mode}) with ID: ${battle.id}`;
                break;
            }

            case "LIST_BATTLES": {
                const battles = result.data as any[];
                const battleList = battles
                    .map(
                        (b) =>
                            `- ${b.name} (${b.mode}) - ${b.creatures.length} creatures - Status: ${b.status}`,
                    )
                    .join("\n");
                responseText = `Current battles:\n${
                    battleList || "No battles found"
                }`;
                break;
            }

            case "GET_BATTLE": {
                responseText = JSON.stringify(result.data, null, 2);
                break;
            }

            case "ADD_CREATURE": {
                const battle = result.data as any;
                responseText = `Added creature to battle "${battle.name}"`;
                break;
            }

            case "UPDATE_CREATURE": {
                const battle = result.data as any;
                responseText = `Updated creature in battle "${battle.name}"`;
                break;
            }

            case "REMOVE_CREATURE": {
                const battle = result.data as any;
                responseText = `Removed creature from battle "${battle.name}"`;
                break;
            }

            case "MOVE_CREATURE": {
                const battle = result.data as any;
                const pos = (args as any).position;
                responseText = `Moved creature to position (${pos.x}, ${pos.y}) in battle "${battle.name}"`;
                break;
            }

            case "START_BATTLE": {
                const battle = result.data as any;
                responseText = `Started battle "${battle.name}" - initiative rolled and turn order established`;
                break;
            }

            case "NEXT_TURN": {
                const battle = result.data as any;
                const currentCreature = battle.creatures[battle.currentTurn];
                responseText = `Advanced to next turn in "${
                    battle.name
                }" - now ${currentCreature?.name || "unknown"}'s turn (round ${
                    battle.round
                })`;
                break;
            }

            case "SET_TERRAIN": {
                const battle = result.data as any;
                const positions = (args as any).positions as any[];
                const terrain = (args as any).terrain;
                responseText = `Set ${positions.length} cells to ${terrain} in battle "${battle.name}"`;
                break;
            }

            case "TOGGLE_DOOR": {
                const battle = result.data as any;
                const pos = (args as any).position;
                responseText = `Toggled door at (${pos.x}, ${pos.y}) in battle "${battle.name}"`;
                break;
            }

            case "UNDO": {
                const battle = result.data as any;
                responseText = `Undid last action in battle "${battle.name}"`;
                break;
            }

            case "LIST_CAMPAIGNS": {
                const campaigns = result.data as any[];
                const campaignList = campaigns
                    .map(
                        (c) =>
                            `- ${c.name}${c.isDefault ? " (Default)" : ""} - ${
                                c.creatures.length
                            } creatures, ${c.maps.length} maps`,
                    )
                    .join("\n");
                responseText = `Current campaigns:\n${
                    campaignList || "No campaigns found"
                }`;
                break;
            }

            case "CREATE_CAMPAIGN": {
                const campaign = result.data as any;
                responseText = `Created campaign "${campaign.name}" with ID: ${campaign.id}`;
                break;
            }

            case "SEARCH_CAMPAIGN_CREATURES": {
                const creatures = result.data as any[];
                const creatureList = creatures
                    .map(
                        (c) =>
                            `- ${c.name} (${c.template.size}, AC ${c.template.ac}, HP ${c.template.maxHp}) - Used ${c.usageCount} times`,
                    )
                    .join("\n");
                responseText = `Found ${creatures.length} creatures:\n${
                    creatureList || "No creatures found"
                }`;
                break;
            }

            case "ADD_CREATURE_FROM_CAMPAIGN": {
                const battle = result.data as any;
                responseText = `Added creature from campaign template to battle "${battle.name}"`;
                break;
            }

            case "ROLL_DICE": {
                const roll = result.data as any;
                const rollDetails = roll.rolls.length > 1
                    ? ` (${roll.rolls.join(", ")})`
                    : "";
                const modifierText = roll.modifier !== 0 ? ` with modifier ${roll.modifier >= 0 ? "+" : ""}${roll.modifier}` : "";
                const descriptionText = roll.description ? `**${roll.description}**\n` : "";
                responseText = `${descriptionText}🎲 Rolled ${roll.notation}${rollDetails}${modifierText}\n**Total: ${roll.total}**`;
                break;
            }

            default: {
                responseText = result.data
                    ? JSON.stringify(result.data, null, 2)
                    : "Operation completed successfully";
                break;
            }
        }

        return {
            content: [
                {
                    type: "text",
                    text: responseText,
                },
            ],
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error executing ${name}: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                },
            ],
            isError: true,
        };
    }
});

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("D&D Battle Manager MCP Server running");
}

if (import.meta.main) {
    main().catch(logger.error);
}
