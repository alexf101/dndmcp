import { Router } from "@oak/oak";
import { BattleStore, HandlerFunction } from "./battle-store.ts";
import { APIResponse, ROUTE_CONFIGS, CommandType } from "./types.ts";

export function generateRoutes(battleStore: BattleStore): Router {
    const router = new Router();

    // Generate static CRUD routes
    router.get("/api/battles", (ctx) => {
        const battles = battleStore.getAllBattles();
        ctx.response.body = { success: true, data: battles } as APIResponse;
    });

    router.post("/api/battles", async (ctx) => {
        const body = await ctx.request.body.json();
        const { name } = body;

        if (!name) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                error: "Battle name is required",
            } as APIResponse;
            return;
        }

        const battle = battleStore.createBattle(name);
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
            return "Battle or creature not found";
        case "NEXT_TURN":
        case "START_BATTLE":
            return "Battle not found";
        case "UNDO":
            return "Battle not found or no actions to undo";
        default:
            return "Resource not found";
    }
}
