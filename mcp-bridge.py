#!/usr/bin/env python3
"""
Minimal FastMCP bridge for DnDMCP API.
Exposes MCP-tagged OpenAPI routes as MCP tools.
"""
import json
import httpx
from fastmcp import FastMCP

def load_openapi_spec():
    """Load the MCP-filtered OpenAPI spec."""
    with open("backend/openapi-mcp.json", "r") as f:
        return json.load(f)

def create_mcp_server():
    """Create FastMCP server from OpenAPI spec."""
    openapi_spec = load_openapi_spec()
    
    client = httpx.AsyncClient(
        base_url="http://localhost:8000",
        timeout=30.0,
    )
    
    mcp = FastMCP.from_openapi(
        openapi_spec=openapi_spec,
        client=client,
        name="DnD Battle Manager",
    )
    
    return mcp

if __name__ == "__main__":
    mcp = create_mcp_server()
    mcp.run()
