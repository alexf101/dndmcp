/**
 * MCP Stdio-to-HTTP Bridge
 * Enables Claude Desktop Free (stdio-only) to communicate with HTTP-based MCP server
 *
 * Reads JSON-RPC messages from stdin, forwards to HTTP endpoint, writes responses to stdout
 */

const MCP_HTTP_URL = "http://localhost:8001/mcp";

interface JSONRPCMessage {
    jsonrpc: string;
    id: number | string;
    method?: string;
    params?: any;
    result?: any;
    error?: any;
}

/**
 * Forward a JSON-RPC message to the HTTP MCP server
 */
async function forwardToHTTP(message: JSONRPCMessage): Promise<JSONRPCMessage> {
    try {
        const response = await fetch(MCP_HTTP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            // Try and read the body anyway, it might have an error message
            const errorBody = await response.json();
            console.error(
                `HTTP error from MCP server: ${response.status} ${response.statusText}`,
                errorBody,
            );
            if (errorBody.error) {
                throw new Error(
                    `HTTP ${response.status}: ${errorBody.error.message}`,
                );
            } else {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }
        }

        const result = await response.json();
        return result as JSONRPCMessage;
    } catch (error) {
        // Return JSON-RPC error response
        return {
            jsonrpc: "2.0",
            id: message.id,
            error: {
                code: -32601, // 32603?
                message: error instanceof Error ? error.message : String(error),
            },
        };
    }
}

/**
 * Main bridge loop: read from stdin, forward to HTTP, write to stdout
 */
async function runBridge() {
    // Log to stderr so it doesn't interfere with JSON-RPC on stdout
    console.error("🌉 MCP stdio-to-HTTP bridge starting...");
    console.error(`   Forwarding to: ${MCP_HTTP_URL}`);
    console.error("   Waiting for JSON-RPC messages on stdin...");

    const decoder = new TextDecoder();
    const reader = Deno.stdin.readable.getReader();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                console.error("🔌 stdin closed, bridge shutting down");
                break;
            }

            // Accumulate data in buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines (JSON-RPC messages)
            let lineEnd;
            while ((lineEnd = buffer.indexOf("\n")) >= 0) {
                const line = buffer.slice(0, lineEnd).trim();
                buffer = buffer.slice(lineEnd + 1);

                if (line.length === 0) {
                    continue; // Skip empty lines
                }

                try {
                    // Parse JSON-RPC message
                    const message: JSONRPCMessage = JSON.parse(line);

                    console.error(
                        `📨 Received: ${message.method || "response"} (id: ${
                            message.id
                        })`,
                    );

                    // Forward to HTTP MCP server
                    const response = await forwardToHTTP(message);

                    // Don't send any result if we didn't get one; it crashes things...
                    if (!response.result) {
                        // The error cause should have already been logged.
                        // console.error(`📤 Sending: error (id: ${response.id})`);
                    } else {
                        console.error(
                            `📤 Sending: result (id: ${response.id})`,
                        );

                        // Write response to stdout (with newline for MCP stdio protocol)
                        await Deno.stdout.write(
                            new TextEncoder().encode(
                                JSON.stringify(response) + "\n",
                            ),
                        );
                    }
                } catch (error) {
                    console.error(`❌ Error processing message: ${error}`);
                    console.error(`   Line was: ${line}`);
                }
            }
        }
    } catch (error) {
        console.error(`❌ Bridge error: ${error}`);
        Deno.exit(1);
    } finally {
        reader.releaseLock();
    }
}

// Run the bridge
if (import.meta.main) {
    runBridge();
}
