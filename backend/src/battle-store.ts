import { BattleState, BattleAction, Creature } from "./types.ts";

export type HandlerFunction = (
    // deno-lint-ignore no-explicit-any
    ...args: any[]
) => BattleState | BattleState[] | null;

export class BattleStore {
    private battles: Map<string, BattleState> = new Map();
    private actionIdCounter = 0;

    createBattle(name: string): BattleState {
        const id = crypto.randomUUID();
        const battle: BattleState = {
            id,
            name,
            creatures: [],
            currentTurn: 0,
            round: 1,
            isActive: false,
            history: [],
        };

        this.battles.set(id, battle);
        return battle;
    }

    getBattle(id: string): BattleState | null {
        return this.battles.get(id) || null;
    }

    getAllBattles(): BattleState[] {
        return Array.from(this.battles.values());
    }

    addCreature(battleId: string, creature: Creature): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "ADD_CREATURE",
            data: { creature },
            previousState: { creatures: [...battle.creatures] },
        };

        battle.creatures.push({
            ...creature,
            id: creature.id || crypto.randomUUID(),
        });
        battle.creatures.sort((a, b) => b.initiative - a.initiative);
        battle.history.push(action);

        return battle;
    }

    updateCreature(
        battleId: string,
        creatureId: string,
        updates: Partial<Creature>,
    ): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        const creatureIndex = battle.creatures.findIndex(
            (c) => c.id === creatureId,
        );
        if (creatureIndex === -1) return null;

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "UPDATE_CREATURE",
            data: { creatureId, updates },
            previousState: { creatures: [...battle.creatures] },
        };

        battle.creatures[creatureIndex] = {
            ...battle.creatures[creatureIndex],
            ...updates,
        };
        battle.history.push(action);

        return battle;
    }

    removeCreature(battleId: string, creatureId: string): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "REMOVE_CREATURE",
            data: { creatureId },
            previousState: { creatures: [...battle.creatures] },
        };

        battle.creatures = battle.creatures.filter((c) => c.id !== creatureId);
        battle.history.push(action);

        return battle;
    }

    nextTurn(battleId: string): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle || battle.creatures.length === 0) return null;

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "NEXT_TURN",
            data: {},
            previousState: {
                currentTurn: battle.currentTurn,
                round: battle.round,
            },
        };

        battle.currentTurn = (battle.currentTurn + 1) % battle.creatures.length;
        if (battle.currentTurn === 0) {
            battle.round++;
        }
        battle.history.push(action);

        return battle;
    }

    undo(battleId: string): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle || battle.history.length === 0) return null;

        const lastAction = battle.history.pop()!;
        if (lastAction.previousState) {
            Object.assign(battle, lastAction.previousState);
        }

        return battle;
    }

    startBattle(battleId: string): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        battle.isActive = true;
        battle.currentTurn = 0;
        battle.round = 1;

        return battle;
    }
}
