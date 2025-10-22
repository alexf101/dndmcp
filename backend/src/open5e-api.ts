import { OPEN_5E_SCHEMA_FILE, OPEN_5E_API_CACHE_FILE } from "./config.ts";
import { parse as parseYaml } from "jsr:@std/yaml";

// Simple in-memory cache with persistence to file
// Keyed by path + query params; exact matches only, no invalidation.
// Value is the JSON response from Open5e API
interface CacheKey {
    path: string;
    queryParams: Record<string, unknown>;
}
interface CacheValue {
    response: object;
}
function cacheKey(key: CacheKey): string {
    return `${key.path}?${new URLSearchParams(
        key.queryParams as Record<string, string>,
    ).toString()}`;
}
let Cache: Record<string, CacheValue> = {};

// Parse the schema once to extract endpoints
interface SchemaEndpoint {
    path: string;
    methods: string[];
    description?: string;
}

let cachedEndpoints: SchemaEndpoint[] | null = null;

function parseSchemaEndpoints(schemaText: string): SchemaEndpoint[] {
    try {
        const schema = parseYaml(schemaText) as any;
        const endpoints: SchemaEndpoint[] = [];

        if (schema.paths && typeof schema.paths === "object") {
            for (const [path, methods] of Object.entries(schema.paths)) {
                const methodNames = Object.keys(methods as object).filter((m) =>
                    ["get", "post", "put", "delete", "patch"].includes(
                        m.toLowerCase(),
                    ),
                );

                // Extract description from the first method's description
                let description: string | undefined;
                if (methodNames.length > 0) {
                    const firstMethod = (methods as Record<string, unknown>)[
                        methodNames[0]
                    ];
                    if (
                        firstMethod &&
                        typeof firstMethod === "object" &&
                        "description" in firstMethod
                    ) {
                        description = (
                            firstMethod as { description?: string }
                        ).description?.slice(0, 100);
                    }
                }

                endpoints.push({
                    path,
                    methods: methodNames.map((m) => m.toUpperCase()),
                    description,
                });
            }
        }

        return endpoints;
    } catch (error) {
        console.error("Failed to parse schema", error);
        return [];
    }
}

export class Open5eApi {
    static getSchema() {
        console.log("SCHEMA PATH: ", OPEN_5E_SCHEMA_FILE);
        return Deno.readTextFileSync(OPEN_5E_SCHEMA_FILE);
    }

    static getSchemaEndpoints(): SchemaEndpoint[] {
        if (cachedEndpoints === null) {
            const schemaText = this.getSchema();
            cachedEndpoints = parseSchemaEndpoints(schemaText);
        }
        return cachedEndpoints;
    }

    static reloadCache() {
        try {
            const data = Deno.readTextFileSync(OPEN_5E_API_CACHE_FILE);
            Cache = JSON.parse(data);
        } catch {
            Cache = {};
        }
    }

    static saveToCache(entry: { key: CacheKey; value: CacheValue }) {
        Cache[cacheKey(entry.key)] = entry.value;
        Deno.writeTextFileSync(OPEN_5E_API_CACHE_FILE, JSON.stringify(Cache));
        this.reloadCache();
    }

    static getFromCache(key: CacheKey): CacheValue | undefined {
        return Cache[cacheKey(key)];
    }

    static async lookup(
        path: string,
        queryParams: Record<string, unknown>,
    ): Promise<object> {
        if (!path || typeof path !== "string") {
            return {
                success: false,
                error: "Invalid params: 'path' is required",
            };
        }
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        if (!path.endsWith("/")) {
            path = path + "/";
        }
        if (path.startsWith("/api") || path.startsWith("/v2")) {
            // Strip unnecessary prefixes if present
            path = path.replace(/^\/(api|v2)/, "");
        }
        const cachedResult = this.getFromCache({ path, queryParams });
        if (cachedResult) {
            return cachedResult.response;
        }
        // Forward the request to the Open5e API
        const response = await fetch(
            `https://api.open5e.com/v2${
                path.endsWith("/") ? path : path + "/"
            }?` +
                new URLSearchParams(
                    queryParams as Record<string, string>,
                ).toString(),
        );
        if (!response.ok) {
            throw new Error(
                `Open5e API request failed: ${response.status} ${response.statusText}`,
            );
        }
        const result = await response.json();
        this.saveToCache({
            key: { path, queryParams },
            value: { response: result },
        });

        return result;
    }

    // Lazy-loading schema methods
    static schemaOverview(): object {
        const endpoints = this.getSchemaEndpoints();
        return {
            endpoint_count: endpoints.length,
            endpoints: endpoints.map((e) => ({
                path: e.path,
                methods: e.methods,
            })),
        };
    }

    static schemaEndpointDetail(path: string): object {
        // Normalize the path
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        if (!path.endsWith("/")) {
            path = path + "/";
        }
        // Avoid footguns; all endpoints in schema begin with /v2/
        path = "/v2" + path.replace(/^\/(api|v2)/, "");
        console.error("Looking up schema detail for normalised path:", path);

        // Parse the full schema to get detailed info for this endpoint
        try {
            const schemaText = this.getSchema();
            const schema = parseYaml(schemaText) as any;
            const endpointData = schema.paths[path];

            if (!endpointData) {
                return { success: false, error: "Endpoint data not found" };
            }

            // Return detailed info about this endpoint
            return {
                path: path,
                methods: Object.keys(endpointData)
                    .filter((m) =>
                        ["get", "post", "put", "delete", "patch"].includes(
                            m.toLowerCase(),
                        ),
                    )
                    .map((method) => {
                        const methodData = endpointData[method];
                        return {
                            method: method.toUpperCase(),
                            description:
                                (methodData as { description?: string })
                                    ?.description || "",
                            parameters:
                                (methodData as { parameters?: unknown[] })
                                    ?.parameters || [],
                        };
                    }),
            };
        } catch (e) {
        return {
        success: false,
        error: `Failed to parse schema: ${e instanceof Error ? e.message : String(e)}`,
        };
        }
    }
}
