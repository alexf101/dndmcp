import {
    BattleState,
    BattleAction,
    Creature,
    BattleMode,
    BattleMap,
    GridPosition,
    TerrainType,
    createEmptyMap,
    canCreatureOccupyPosition,
    getMapCell,
    isValidPosition
} from "./types.ts";
import { CampaignStore } from "./campaign-store.ts";

export type HandlerFunction = (
    // deno-lint-ignore no-explicit-any
    ...args: any[]
) => BattleState | BattleState[] | null | void;

export class BattleStore {
    private battles: Map<string, BattleState> = new Map();
    private actionIdCounter = 0;
    private campaignStore: CampaignStore;

    constructor(campaignStore: CampaignStore) {
        this.campaignStore = campaignStore;
    }

    createBattle(
        name: string,
        mode: BattleMode = 'TheatreOfMind',
        mapSize?: { width: number; height: number },
        sceneDescription?: string
    ): BattleState {
        const id = crypto.randomUUID();

        let map: BattleMap | undefined;
        if (mode === 'GridBased') {
            const width = mapSize?.width || 25;
            const height = mapSize?.height || 25;
            map = createEmptyMap(width, height, `Battle map for ${name}`);
        }

        const battle: BattleState = {
            id,
            name,
            creatures: [],
            currentTurn: 0,
            round: 1,
            isActive: false,
            history: [],
            mode,
            map,
            sceneDescription: mode === 'TheatreOfMind' ? sceneDescription : undefined,
            creaturePositions: mode === 'TheatreOfMind' ? undefined : undefined,
        };

        this.battles.set(id, battle);

        // Automatically register the map to the default campaign if it's grid-based
        if (mode === 'GridBased' && map) {
            try {
                this.campaignStore.addMapToDefaultCampaign(map, battle);
            } catch (error) {
                console.warn("Failed to register map to default campaign:", error);
            }
        }

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

        // For grid-based battles, validate position if provided
        if (battle.mode === 'GridBased' && battle.map && creature.position) {
            const positionCheck = canCreatureOccupyPosition(
                battle.map,
                creature.position,
                creature.size,
                undefined,
                battle.creatures
            );
            if (!positionCheck.canOccupy) {
                throw new Error(`Cannot place creature at position: ${positionCheck.reason}`);
            }
        }

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "ADD_CREATURE",
            data: { creature },
            previousState: { creatures: [...battle.creatures] },
        };

        const newCreature = {
            ...creature,
            id: creature.id || crypto.randomUUID(),
        };

        battle.creatures.push(newCreature);
        battle.creatures.sort((a, b) => b.initiative - a.initiative);
        battle.history.push(action);

        // Automatically register the creature to the default campaign
        try {
            this.campaignStore.addCreatureToDefaultCampaign(newCreature, battle);
        } catch (error) {
            console.warn("Failed to register creature to default campaign:", error);
        }

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

    // Map-specific methods

    moveCreature(
        battleId: string,
        creatureId: string,
        data: { position: GridPosition }
    ): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        // Only grid-based battles support movement
        if (battle.mode !== 'GridBased' || !battle.map) {
            throw new Error('Movement is only supported in grid-based battles');
        }

        const creatureIndex = battle.creatures.findIndex(c => c.id === creatureId);
        if (creatureIndex === -1) return null;

        const creature = battle.creatures[creatureIndex];
        const { position } = data;

        // Validate the new position
        const positionCheck = canCreatureOccupyPosition(
            battle.map,
            position,
            creature.size,
            creatureId,
            battle.creatures
        );
        if (!positionCheck.canOccupy) {
            throw new Error(`Cannot move creature to position: ${positionCheck.reason}`);
        }

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "MOVE_CREATURE",
            data: { creatureId, position },
            previousState: { creatures: [...battle.creatures] },
        };

        battle.creatures[creatureIndex] = {
            ...creature,
            position
        };
        battle.history.push(action);

        return battle;
    }

    setTerrain(
        battleId: string,
        data: {
            positions: GridPosition[];
            terrain: TerrainType;
            doorOpen?: boolean;
            elevation?: number;
            hazardDamage?: number;
        }
    ): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        // Only grid-based battles have maps
        if (battle.mode !== 'GridBased' || !battle.map) {
            throw new Error('Terrain modification is only supported in grid-based battles');
        }

        const { positions, terrain, doorOpen, elevation, hazardDamage } = data;

        // Validate all positions are within map bounds
        for (const pos of positions) {
            if (!isValidPosition(battle.map, pos)) {
                throw new Error(`Position (${pos.x}, ${pos.y}) is outside map bounds`);
            }
        }

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "SET_TERRAIN",
            data: { positions, terrain, doorOpen, elevation, hazardDamage },
            previousState: {
                map: {
                    ...battle.map,
                    cells: battle.map.cells.map(row => [...row])
                }
            },
        };

        // Apply terrain changes
        for (const pos of positions) {
            const cell = battle.map.cells[pos.y][pos.x];
            cell.terrain = terrain;
            if (doorOpen !== undefined) cell.doorOpen = doorOpen;
            if (elevation !== undefined) cell.elevation = elevation;
            if (hazardDamage !== undefined) cell.hazardDamage = hazardDamage;
        }

        battle.history.push(action);
        return battle;
    }

    toggleDoor(battleId: string, data: { position: GridPosition }): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        if (battle.mode !== 'GridBased' || !battle.map) {
            throw new Error('Door manipulation is only supported in grid-based battles');
        }

        const { position } = data;

        if (!isValidPosition(battle.map, position)) {
            throw new Error(`Position (${position.x}, ${position.y}) is outside map bounds`);
        }

        const cell = getMapCell(battle.map, position);
        if (!cell || cell.terrain !== 'Door') {
            throw new Error('No door at specified position');
        }

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "TOGGLE_DOOR",
            data: { position },
            previousState: {
                map: {
                    ...battle.map,
                    cells: battle.map.cells.map(row => [...row])
                }
            },
        };

        // Toggle door state
        cell.doorOpen = !cell.doorOpen;

        battle.history.push(action);
        return battle;
    }

    // Campaign integration methods

    addCreatureFromCampaign(battleId: string, campaignCreatureId: string, position?: GridPosition): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        const creature = this.campaignStore.createCreatureFromCampaign(campaignCreatureId, position);
        if (!creature) return null;

        // For grid-based battles, validate position if provided
        if (battle.mode === 'GridBased' && battle.map && creature.position) {
            const positionCheck = canCreatureOccupyPosition(
                battle.map,
                creature.position,
                creature.size,
                undefined,
                battle.creatures
            );
            if (!positionCheck.canOccupy) {
                throw new Error(`Cannot place creature at position: ${positionCheck.reason}`);
            }
        }

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "ADD_CREATURE",
            data: { creature },
            previousState: { creatures: [...battle.creatures] },
        };

        battle.creatures.push(creature);
        battle.creatures.sort((a, b) => b.initiative - a.initiative);
        battle.history.push(action);

        return battle;
    }

    // Theatre of Mind description methods

    updateSceneDescription(battleId: string, data: { description: string }): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "UPDATE_SCENE_DESCRIPTION",
            data: { description: data.description },
            previousState: { sceneDescription: battle.sceneDescription },
        };

        battle.sceneDescription = data.description;
        battle.history.push(action);

        return battle;
    }

    updateCreaturePositions(battleId: string, data: { positions: string }): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "UPDATE_CREATURE_POSITIONS",
            data: { positions: data.positions },
            previousState: { creaturePositions: battle.creaturePositions },
        };

        battle.creaturePositions = data.positions;
        battle.history.push(action);

        return battle;
    }

    // Test utility method to clear all battles
    clearAllBattles(): void {
        this.battles.clear();
        this.actionIdCounter = 0;
    }
}
