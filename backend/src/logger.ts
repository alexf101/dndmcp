// MCP-safe logger that ensures all output goes to stderr
// This prevents corruption of the JSON-RPC stream on stdout

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4,
}

class Logger {
    private level: LogLevel;

    constructor() {
        // Default to INFO level, can be overridden with environment variable
        const envLevel = Deno.env.get("LOG_LEVEL")?.toUpperCase();
        switch (envLevel) {
            case "DEBUG":
                this.level = LogLevel.DEBUG;
                break;
            case "INFO":
                this.level = LogLevel.INFO;
                break;
            case "WARN":
                this.level = LogLevel.WARN;
                break;
            case "ERROR":
                this.level = LogLevel.ERROR;
                break;
            case "SILENT":
                this.level = LogLevel.SILENT;
                break;
            default:
                this.level = LogLevel.INFO;
        }
    }

    private log(level: LogLevel, levelName: string, ...args: unknown[]) {
        if (level < this.level) return;

        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${levelName}]`;

        // CRITICAL: Always use console.error for MCP stdio compatibility
        // stdout is reserved for JSON-RPC messages only
        console.error(prefix, ...args);
    }

    debug(...args: unknown[]) {
        this.log(LogLevel.DEBUG, "DEBUG", ...args);
    }

    info(...args: unknown[]) {
        this.log(LogLevel.INFO, "INFO", ...args);
    }

    warn(...args: unknown[]) {
        this.log(LogLevel.WARN, "WARN", ...args);
    }

    error(...args: unknown[]) {
        this.log(LogLevel.ERROR, "ERROR", ...args);
    }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience function for quick replacement of console.log
export const log = (...args: unknown[]) => logger.info(...args);