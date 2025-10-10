/**
 * Dice rolling utilities for D&D 5e
 * Supports standard D&D dice: d4, d6, d8, d10, d12, d20, d100
 */

export interface DiceRoll {
    notation: string; // e.g., "2d20+5"
    rolls: number[]; // Individual die results
    total: number; // Sum of rolls + modifier
    modifier: number; // Modifier applied
    description?: string; // Optional description of what this roll is for
    timestamp: number; // When the roll was made
}

/**
 * Roll dice using standard D&D notation
 * Examples:
 * - "1d20" - Roll one d20
 * - "2d6+3" - Roll two d6 and add 3
 * - "4d6kh3" - Roll 4d6, keep highest 3 (for ability scores)
 * - "2d20kh1" - Roll with advantage (2d20, keep highest 1)
 * - "2d20kl1" - Roll with disadvantage (2d20, keep lowest 1)
 */
export function rollDice(
    notation: string,
    additionalModifier: number = 0,
    description?: string,
): DiceRoll {
    // Parse dice notation: [count]d[sides][+/-modifier][kh/kl][keep]
    const match = notation.match(
        /^(\d+)d(\d+)([+-]\d+)?(kh|kl)?(\d+)?$/i,
    );

    if (!match) {
        throw new Error(
            `Invalid dice notation: ${notation}. Use format like "2d20", "1d6+3", or "4d6kh3"`,
        );
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const notationModifier = match[3] ? parseInt(match[3]) : 0;
    const keepType = match[4]?.toLowerCase(); // "kh" or "kl"
    const keepCount = match[5] ? parseInt(match[5]) : count;

    // Validate dice type (D&D 5e standard dice)
    const validDice = [4, 6, 8, 10, 12, 20, 100];
    if (!validDice.includes(sides)) {
        throw new Error(
            `Invalid die type: d${sides}. Valid dice: d4, d6, d8, d10, d12, d20, d100`,
        );
    }

    // Validate count
    if (count < 1 || count > 100) {
        throw new Error("Dice count must be between 1 and 100");
    }

    // Roll the dice
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    // Handle keep highest/lowest
    let finalRolls = [...rolls];
    if (keepType && keepCount < count) {
        finalRolls.sort((a, b) => (keepType === "kh" ? b - a : a - b));
        finalRolls = finalRolls.slice(0, keepCount);
    }

    // Calculate total
    const modifier = notationModifier + additionalModifier;
    const total = finalRolls.reduce((sum, roll) => sum + roll, 0) + modifier;

    return {
        notation: notation + (additionalModifier !== 0 ? `${additionalModifier >= 0 ? "+" : ""}${additionalModifier}` : ""),
        rolls,
        total,
        modifier,
        description,
        timestamp: Date.now(),
    };
}

/**
 * Roll with advantage (2d20, keep highest)
 */
export function rollWithAdvantage(modifier: number = 0, description?: string): DiceRoll {
    return rollDice("2d20kh1", modifier, description || "Advantage");
}

/**
 * Roll with disadvantage (2d20, keep lowest)
 */
export function rollWithDisadvantage(modifier: number = 0, description?: string): DiceRoll {
    return rollDice("2d20kl1", modifier, description || "Disadvantage");
}

/**
 * Roll ability score (4d6, drop lowest)
 */
export function rollAbilityScore(): DiceRoll {
    return rollDice("4d6kh3", 0, "Ability Score");
}

/**
 * Common D&D rolls
 */
export const commonRolls = {
    initiative: (modifier: number = 0) => rollDice("1d20", modifier, "Initiative"),
    attack: (modifier: number = 0) => rollDice("1d20", modifier, "Attack Roll"),
    savingThrow: (modifier: number = 0, ability?: string) =>
        rollDice("1d20", modifier, ability ? `${ability} Save` : "Saving Throw"),
    skillCheck: (modifier: number = 0, skill?: string) =>
        rollDice("1d20", modifier, skill ? `${skill} Check` : "Skill Check"),
    damage: (notation: string, description?: string) =>
        rollDice(notation, 0, description || "Damage"),
};
