import { Router } from "@oak/oak";
import { BattleStore, HandlerFunction } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";
import {
    APIResponse,
    ROUTE_CONFIGS,
    CommandType,
    CampaignCommandType,
} from "./types.ts";
import { ImpossibleCommandError } from "./errors.ts";
import { sseManager } from "./sse-manager.ts";

export function generateRoutes(
    battleStore: BattleStore,
    campaignStore: CampaignStore,
): Router {
    const router = new Router();

    // Generate static CRUD routes
    router.get("/api/battles", (ctx) => {
        const battles = battleStore.getAllBattles();
        ctx.response.body = { success: true, data: battles } as APIResponse;
    });

    router.post("/api/battles", async (ctx) => {
        const body = await ctx.request.body.json();
        const { name, mode, mapSize, sceneDescription } = body;

        if (!name) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                error: "Battle name is required",
            } as APIResponse;
            return;
        }

        const battle = battleStore.createBattle(
            name,
            mode,
            mapSize,
            sceneDescription,
        );
        ctx.response.body = { success: true, data: battle } as APIResponse;
    });

    router.get("/api/battles/:id", (ctx) => {
        const { id } = ctx.params;
        const battle = battleStore.getBattle(id);

        if (!battle) {
            ctx.response.status = 404;
            ctx.response.body = {
                success: false,
                error: "Battle not found",
            } as APIResponse;
            return;
        }

        ctx.response.body = { success: true, data: battle } as APIResponse;
    });

    // Generate command routes dynamically from ROUTE_CONFIGS
    for (const [commandType, config] of Object.entries(ROUTE_CONFIGS)) {
        // Skip CREATE_BATTLE as it's handled above with different logic
        if (commandType === "CREATE_BATTLE") continue;

        const method = config.method.toLowerCase() as
            | "get"
            | "post"
            | "put"
            | "delete";

        router[method](config.path, async (ctx) => {
            try {
                // Extract path parameters
                const pathParams =
                    config.pathParams?.map((param) => ctx.params[param]) || [];

                // Extract and validate body if needed
                // deno-lint-ignore no-explicit-any
                let bodyData: any = null;
                if (
                    config.bodyExtractor === "body" &&
                    (method === "post" || method === "put")
                ) {
                    bodyData = await ctx.request.body.json();

                    // Validate required fields
                    if (config.validation) {
                        const missingFields = config.validation.filter(
                            (field) =>
                                bodyData[field] === undefined ||
                                bodyData[field] === null,
                        );
                        if (missingFields.length > 0) {
                            ctx.response.status = 400;
                            ctx.response.body = {
                                success: false,
                                error: `Missing required fields: ${missingFields.join(
                                    ", ",
                                )}`,
                            } as APIResponse;
                            return;
                        }
                    }
                }

                // Derive handler method name from command type
                const handlerName = commandTypeToMethodName(
                    commandType as CommandType,
                );
                const handler: HandlerFunction =
                    battleStore[handlerName as keyof BattleStore];
                if (!handler || typeof handler !== "function") {
                    throw new Error(
                        `Handler method '${handlerName}' not found on BattleStore`,
                    );
                }

                // Build arguments for handler call
                const args = [...pathParams];
                if (bodyData !== null) {
                    args.push(bodyData);
                }

                // Call handler
                const result = handler.apply(battleStore, args);

                if (!result) {
                    ctx.response.status = 404;
                    ctx.response.body = {
                        success: false,
                        error: getNotFoundMessage(commandType as CommandType),
                    } as APIResponse;
                    return;
                }

                ctx.response.body = {
                    success: true,
                    data: result,
                } as APIResponse;
            } catch (error) {
                if (error instanceof ImpossibleCommandError) {
                    ctx.response.status = 400;
                    ctx.response.body = {
                        success: false,
                        error: `Impossible command: ${error.message}`,
                    } as APIResponse;
                    return;
                }
                console.error(`Error handling ${commandType}:`, error);
                ctx.response.status = 500;
                ctx.response.body = {
                    success: false,
                    error: `Internal server error: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`,
                } as APIResponse;
            }
        });
    }

    // === Campaign Management Routes ===

    router.get("/api/campaigns", (ctx) => {
        const campaigns = campaignStore.getAllCampaigns();
        ctx.response.body = { success: true, data: campaigns } as APIResponse;
    });

    router.post("/api/campaigns", async (ctx) => {
        const body = await ctx.request.body.json();
        const { name, description } = body;

        if (!name) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                error: "Campaign name is required",
            } as APIResponse;
            return;
        }

        const campaign = campaignStore.createCampaign(name, description);
        ctx.response.body = { success: true, data: campaign } as APIResponse;
    });

    router.get("/api/campaigns/:id", (ctx) => {
        const { id } = ctx.params;
        const campaign = campaignStore.getCampaign(id);

        if (!campaign) {
            ctx.response.status = 404;
            ctx.response.body = {
                success: false,
                error: "Campaign not found",
            } as APIResponse;
            return;
        }

        ctx.response.body = { success: true, data: campaign } as APIResponse;
    });

    router.put("/api/campaigns/:campaignId", async (ctx) => {
        const { campaignId } = ctx.params;
        const body = await ctx.request.body.json();
        const { name, description } = body;

        const campaign = campaignStore.updateCampaign(campaignId, {
            name,
            description,
        });

        if (!campaign) {
            ctx.response.status = 404;
            ctx.response.body = {
                success: false,
                error: "Campaign not found",
            } as APIResponse;
            return;
        }

        ctx.response.body = { success: true, data: campaign } as APIResponse;
    });

    router.delete("/api/campaigns/:campaignId", (ctx) => {
        const { campaignId } = ctx.params;

        try {
            const success = campaignStore.deleteCampaign(campaignId);

            if (!success) {
                ctx.response.status = 404;
                ctx.response.body = {
                    success: false,
                    error: "Campaign not found",
                } as APIResponse;
                return;
            }

            ctx.response.body = { success: true } as APIResponse;
        } catch (error) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to delete campaign",
            } as APIResponse;
        }
    });

    // Add creature from campaign to battle
    router.post(
        "/api/battles/:battleId/creatures/from-campaign/:campaignCreatureId",
        async (ctx) => {
            const { battleId, campaignCreatureId } = ctx.params;

            try {
                const body = await ctx.request.body.json().catch(() => ({}));
                const { position } = body;

                const battle = battleStore.addCreatureFromCampaign(
                    battleId,
                    campaignCreatureId,
                    position,
                );

                if (!battle) {
                    ctx.response.status = 404;
                    ctx.response.body = {
                        success: false,
                        error: "Battle or campaign creature not found",
                    } as APIResponse;
                    return;
                }

                ctx.response.body = {
                    success: true,
                    data: battle,
                } as APIResponse;
            } catch (error) {
                ctx.response.status = 400;
                ctx.response.body = {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to add creature from campaign",
                } as APIResponse;
            }
        },
    );

    // Search endpoints
    router.get("/api/campaigns/creatures/search", (ctx) => {
        const query = ctx.request.url.searchParams.get("q") || "";
        const campaignId =
            ctx.request.url.searchParams.get("campaignId") || undefined;

        const results = campaignStore.searchCreatures(query, campaignId);
        ctx.response.body = { success: true, data: results } as APIResponse;
    });

    router.get("/api/campaigns/maps/search", (ctx) => {
        const query = ctx.request.url.searchParams.get("q") || "";
        const campaignId =
            ctx.request.url.searchParams.get("campaignId") || undefined;

        const results = campaignStore.searchMaps(query, campaignId);
        ctx.response.body = { success: true, data: results } as APIResponse;
    });

    // SSE Routes for real-time updates
    router.get("/api/events", async (ctx) => {
        await sseManager.handleSSEConnection(ctx);
    });

    router.get("/api/events/battle/:battleId", async (ctx) => {
        const { battleId } = ctx.params;
        await sseManager.handleSSEConnection(ctx, battleId);
    });

    return router;
}

function commandTypeToMethodName(commandType: CommandType): string {
    // Convert "ADD_CREATURE" to "addCreature", "NEXT_TURN" to "nextTurn", etc.
    return commandType
        .toLowerCase()
        .split("_")
        .map((word, index) =>
            index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join("");
}

function getNotFoundMessage(commandType: CommandType): string {
    switch (commandType) {
        case "ADD_CREATURE":
            return "Battle not found";
        case "UPDATE_CREATURE":
        case "REMOVE_CREATURE":
        case "MOVE_CREATURE":
            return "Battle or creature not found";
        case "NEXT_TURN":
        case "START_BATTLE":
            return "Battle not found";
        case "UNDO":
            return "Battle not found or no actions to undo";
        case "SET_TERRAIN":
        case "TOGGLE_DOOR":
            return "Battle not found or not a grid-based battle";
        case "UPDATE_SCENE_DESCRIPTION":
        case "UPDATE_CREATURE_POSITIONS":
            return "Battle not found";
        default:
            return "Resource not found";
    }
}
