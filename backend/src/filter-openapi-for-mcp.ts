import type { OpenAPIObject } from "npm:openapi3-ts@4.5.0/oas31";

export function filterOpenAPIForMCP(spec: OpenAPIObject): OpenAPIObject {
  const filtered: OpenAPIObject = {
    openapi: spec.openapi,
    info: spec.info,
    servers: spec.servers,
    components: spec.components,
    paths: {},
  };

  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    const filteredPath: typeof pathItem = {};
    let hasIncludedOperation = false;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (method === "parameters" || method === "servers" || method === "description" || method === "summary") {
        continue;
      }

      const op = operation as { tags?: string[] };
      if (op.tags?.includes("mcp")) {
        filteredPath[method] = operation;
        hasIncludedOperation = true;
      }
    }

    if (hasIncludedOperation) {
      filtered.paths![path] = { ...pathItem, ...filteredPath };
    }
  }

  return filtered;
}
