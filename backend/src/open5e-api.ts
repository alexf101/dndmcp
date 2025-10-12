import { OPEN_5E_SCHEMA_FILE, OPEN_5E_API_CACHE_FILE } from "./config.ts";

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

export class Open5eApi {
    static getSchema() {
        console.log("SCHEMA PATH: ", OPEN_5E_SCHEMA_FILE);
        return Deno.readTextFileSync(OPEN_5E_SCHEMA_FILE);
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
}
