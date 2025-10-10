import { Context } from "@oak/oak";
import { logger } from "./logger.ts";

export interface SSEClient {
    id: string;
    controller: ReadableStreamDefaultController;
    battleId?: string;
}

export class SSEManager {
    private clients: Map<string, SSEClient> = new Map();
    private clientIdCounter = 0;

    // Create SSE endpoint handler
    async handleSSEConnection(ctx: Context, battleId?: string) {
        const clientId = `client_${++this.clientIdCounter}`;

        // Set headers for SSE
        ctx.response.headers.set("Content-Type", "text/event-stream");
        ctx.response.headers.set("Cache-Control", "no-cache");
        ctx.response.headers.set("Connection", "keep-alive");
        ctx.response.headers.set("Access-Control-Allow-Origin", "*");
        ctx.response.headers.set("Access-Control-Allow-Headers", "Cache-Control");

        const stream = new ReadableStream({
            start: (controller) => {
                const client: SSEClient = {
                    id: clientId,
                    controller,
                    battleId,
                };

                this.clients.set(clientId, client);
                logger.info(`SSE client ${clientId} connected${battleId ? ` for battle ${battleId}` : ""}`);

                // Send initial connection message
                this.sendToClient(client, {
                    type: "connected",
                    clientId,
                    battleId,
                    timestamp: Date.now(),
                });

                // Keep connection alive with periodic pings
                const pingInterval = setInterval(() => {
                    if (this.clients.has(clientId)) {
                        this.sendPing(client);
                    } else {
                        clearInterval(pingInterval);
                    }
                }, 30000); // ping every 30 seconds

                // Handle connection close - we don't have direct access to connection events
                // The cleanup will happen when the stream is terminated
            },
        });

        ctx.response.body = stream;
    }

    // Send event to a specific client
    private sendToClient(client: SSEClient, data: any) {
        try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            client.controller.enqueue(new TextEncoder().encode(message));
        } catch (error) {
            logger.error(`Failed to send to client ${client.id}:`, error);
            this.clients.delete(client.id);
        }
    }

    // Send ping to keep connection alive
    private sendPing(client: SSEClient) {
        try {
            const message = `event: ping\ndata: ${Date.now()}\n\n`;
            client.controller.enqueue(new TextEncoder().encode(message));
        } catch (error) {
            logger.error(`Failed to ping client ${client.id}:`, error);
            this.clients.delete(client.id);
        }
    }

    // Broadcast battle update to all clients watching that battle
    broadcastBattleUpdate(battleId: string, battleState: any) {
        const message = {
            type: "battle_updated",
            battleId,
            battleState,
            timestamp: Date.now(),
        };

        // Send to clients watching this specific battle
        for (const client of this.clients.values()) {
            if (client.battleId === battleId) {
                this.sendToClient(client, message);
            }
        }

        // Also send to clients not watching a specific battle (general listeners)
        for (const client of this.clients.values()) {
            if (!client.battleId) {
                this.sendToClient(client, message);
            }
        }

        logger.debug(`Broadcasted battle update for ${battleId} to ${this.getClientCount(battleId)} clients`);
    }

    // Broadcast battle list update
    broadcastBattleListUpdate(battles: any[]) {
        const message = {
            type: "battle_list_updated",
            battles,
            timestamp: Date.now(),
        };

        // Send to all clients
        for (const client of this.clients.values()) {
            this.sendToClient(client, message);
        }

        logger.debug(`Broadcasted battle list update to ${this.clients.size} clients`);
    }

    // Get number of clients watching a specific battle
    private getClientCount(battleId?: string): number {
        let count = 0;
        for (const client of this.clients.values()) {
            if (client.battleId === battleId) {
                count++;
            }
        }
        return count;
    }

    // Get total client count
    getConnectedClientCount(): number {
        return this.clients.size;
    }

    // Close all connections (for cleanup)
    closeAllConnections() {
        for (const client of this.clients.values()) {
            try {
                client.controller.close();
            } catch (error) {
                logger.error(`Failed to close client ${client.id}:`, error);
            }
        }
        this.clients.clear();
        logger.info("All SSE connections closed");
    }
}

// Export singleton instance
export const sseManager = new SSEManager();