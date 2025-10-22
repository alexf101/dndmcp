import { useEffect, useRef, useState, useCallback } from "react";

export interface SSEMessage {
    type:
        | "connected"
        | "battle_updated"
        | "battle_list_updated"
        | "dice_rolled"
        | "ping";
    clientId?: string;
    battleId?: string;
    battleState?: any;
    battles?: any[];
    roll?: any;
    timestamp: number;
}

export interface UseSSEOptions {
    url: string;
    battleId?: string;
    onMessage?: (message: SSEMessage) => void;
    onError?: (error: Event) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    autoReconnect?: boolean;
    reconnectInterval?: number;
}

export function useSSE(options: UseSSEOptions) {
    const {
        url,
        battleId,
        onMessage,
        onError,
        onConnect,
        onDisconnect,
        autoReconnect = true,
        reconnectInterval = 3000,
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    // Build the SSE URL
    const sseUrl = battleId ? `${url}/battle/${battleId}` : url;

    const connect = useCallback(() => {
        if (
            !mountedRef.current ||
            eventSourceRef.current?.readyState === EventSource.OPEN
        ) {
            return;
        }

        // Clean up existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        console.log(`🔌 Connecting to SSE: ${sseUrl}`);

        try {
            const eventSource = new EventSource(sseUrl);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                if (!mountedRef.current) return;
                console.log("✅ SSE Connected");
                setIsConnected(true);
                setError(null);
                onConnect?.();
            };

            eventSource.onmessage = (event) => {
                if (!mountedRef.current) return;

                try {
                    const message: SSEMessage = JSON.parse(event.data);
                    console.log("📨 SSE Message:", message);
                    onMessage?.(message);
                } catch (err) {
                    console.error("Failed to parse SSE message:", err);
                }
            };

            eventSource.addEventListener("ping", () => {
                if (!mountedRef.current) return;
                // Handle ping events to keep connection alive
                console.log("🏓 SSE Ping received");
            });

            eventSource.onerror = (event) => {
                if (!mountedRef.current) return;

                console.error("❌ SSE Error:", event);
                setIsConnected(false);

                const errorMessage = "SSE connection error";
                setError(errorMessage);
                onError?.(event);
                onDisconnect?.();

                // Auto-reconnect logic
                if (
                    autoReconnect &&
                    eventSource.readyState !== EventSource.CONNECTING
                ) {
                    eventSource.close();
                    eventSourceRef.current = null;

                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }

                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (mountedRef.current) {
                            console.log(
                                `🔄 Attempting to reconnect SSE in ${reconnectInterval}ms...`,
                            );
                            connect();
                        }
                    }, reconnectInterval);
                }
            };
        } catch (err) {
            console.error("Failed to create SSE connection:", err);
            setError(err instanceof Error ? err.message : "Failed to connect");
        }
    }, [
        sseUrl,
        // Don't invalidate on changes to callbacks passed in; it's too fragile
        // to trust that the caller memoizes them properly, and it shouldn't be a
        // real use case to change them dynamically.
        // onMessage,
        // onError,
        // onConnect,
        // onDisconnect,
        autoReconnect,
        reconnectInterval,
    ]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setIsConnected(false);
        onDisconnect?.();
    }, [onDisconnect]);

    // Connect on mount or when URL changes
    useEffect(() => {
        connect();

        return disconnect;
    }, [connect, disconnect]);

    // Cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        error,
        connect,
        disconnect,
    };
}
