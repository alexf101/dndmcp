import type { DiceRoll } from "./dice-roller.ts";
import { logger } from "./logger.ts";

const DICE_DATA_FILE = "./dice-rolls.json";

export interface DiceRollHistory {
    rolls: DiceRoll[];
    maxRolls: number; // Maximum number of rolls to keep
}

export class DiceStore {
    private history: DiceRollHistory = {
        rolls: [],
        maxRolls: 100, // Keep last 100 rolls
    };
    private sseEmitter?: (roll: DiceRoll) => void;

    constructor() {
        this.loadFromFile();
    }

    /**
     * Register SSE emitter for broadcasting dice roll updates
     */
    registerSSEEmitter(emitter: (roll: DiceRoll) => void): void {
        this.sseEmitter = emitter;
    }

    /**
     * Add a dice roll to history
     */
    addRoll(roll: DiceRoll): void {
        this.history.rolls.unshift(roll); // Add to beginning

        // Keep only the last maxRolls
        if (this.history.rolls.length > this.history.maxRolls) {
            this.history.rolls = this.history.rolls.slice(0, this.history.maxRolls);
        }

        this.saveToFile();
        this.emitRollUpdate(roll);
    }

    /**
     * Get all dice rolls (most recent first)
     */
    getAllRolls(limit?: number): DiceRoll[] {
        if (limit) {
            return this.history.rolls.slice(0, limit);
        }
        return this.history.rolls;
    }

    /**
     * Clear all dice roll history
     */
    clearHistory(): void {
        this.history.rolls = [];
        this.saveToFile();
    }

    /**
     * Emit SSE update when a roll is made
     */
    private emitRollUpdate(roll: DiceRoll): void {
        if (this.sseEmitter) {
            this.sseEmitter(roll);
        }
    }

    /**
     * Load dice roll history from file
     */
    private loadFromFile(): void {
        try {
            const data = Deno.readTextFileSync(DICE_DATA_FILE);
            const parsed = JSON.parse(data);
            this.history = parsed;
            logger.info(
                `📖 Dice roll history loaded from ${DICE_DATA_FILE}`,
            );
            logger.info(`   - ${this.history.rolls.length} rolls loaded`);
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                logger.info(
                    `📁 No existing dice roll history file found, starting fresh`,
                );
                this.saveToFile();
            } else {
                logger.error(
                    `❌ Error loading dice roll history from file: ${error}`,
                );
            }
        }
    }

    /**
     * Save dice roll history to file
     */
    private saveToFile(): void {
        try {
            const data = JSON.stringify(this.history, null, 2);
            Deno.writeTextFileSync(DICE_DATA_FILE, data);
        } catch (error) {
            logger.error(`❌ Error saving dice roll history to file: ${error}`);
        }
    }
}
