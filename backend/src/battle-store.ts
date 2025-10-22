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
    isValidPosition,
    CreatureSize,
    BattleSummary,
} from "./types.ts";
import { CampaignStore } from "./campaign-store.ts";
import { ImpossibleCommandError } from "./errors.ts";
import { logger } from "./logger.ts";
import { sseManager } from "./sse-manager.ts";
import { BATTLE_DATA_FILE } from "./config.ts";

interface BattleStoreState {
    battles: Record<string, BattleState>;
    actionIdCounter: number;
}

export type HandlerFunction = (
    // deno-lint-ignore no-explicit-any
    ...args: any[]
) => BattleState | BattleState[] | null | void;

export class BattleStore {
    private battles: Map<string, BattleState> = new Map();
    private actionIdCounter = 0;
    private campaignStore: CampaignStore;
    private saveTimeout: number | null = null;

    constructor(campaignStore: CampaignStore) {
        this.campaignStore = campaignStore;
        this.loadFromFile();
    }

    private loadFromFile() {
        if (Deno.env.get("DISABLE_SAVES") === "true") {
            // Don't save to file during tests
            return;
        }
        try {
            const data = Deno.readTextFileSync(BATTLE_DATA_FILE);
            const state: BattleStoreState = JSON.parse(data);

            // Convert battles object back to Map
            this.battles = new Map(Object.entries(state.battles));
            this.actionIdCounter = state.actionIdCounter;

            logger.info(`📖 Battle data loaded from ${BATTLE_DATA_FILE}`);
            logger.info(`   - ${this.battles.size} battles loaded`);
            logger.info(`   - Action counter at ${this.actionIdCounter}`);
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                logger.info(
                    `📖 No existing battle data file found, starting fresh`,
                );
            } else {
                logger.error("Failed to load battle data:", error);
            }
        }
    }

    private saveToFile() {
        if (Deno.env.get("DISABLE_SAVES") === "true") {
            // Don't save to file during tests
            return;
        }
        // Debounce saves to avoid excessive file I/O
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            try {
                const state: BattleStoreState = {
                    battles: Object.fromEntries(this.battles),
                    actionIdCounter: this.actionIdCounter,
                };
                const data = JSON.stringify(state, null, 2);
                Deno.writeTextFileSync(BATTLE_DATA_FILE, data);
                logger.info(`💾 Battle data saved to ${BATTLE_DATA_FILE}`);
            } catch (error) {
                logger.error("Failed to save battle data:", error);
            }
            this.saveTimeout = null;
        }, 1000); // Save after 1 second of inactivity
    }

    // Emit battle update event via SSE
    private emitBattleUpdate(battleId: string) {
        const battle = this.battles.get(battleId);
        if (battle) {
            sseManager.broadcastBattleUpdate(battleId, battle);
        }
    }

    // Emit battle list update event via SSE
    private emitBattleListUpdate() {
        const battles = this.getAllBattles();
        sseManager.broadcastBattleListUpdate(battles);
    }

    createBattle(
        name: string,
        mode: BattleMode = "TheatreOfMind",
        mapSize?: { width: number; height: number },
        sceneDescription?: string,
    ): BattleState {
        const id = crypto.randomUUID();

        let map: BattleMap | undefined;
        if (mode === "GridBased") {
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
            sceneDescription:
                mode === "TheatreOfMind" ? sceneDescription : undefined,
            creaturePositions: undefined,
        };

        this.battles.set(id, battle);

        // Automatically register the map to the default campaign if it's grid-based
        if (mode === "GridBased" && map) {
            try {
                this.campaignStore.addMapToDefaultCampaign(map, battle);
            } catch (error) {
                logger.warn(
                    "Failed to register map to default campaign:",
                    error,
                );
            }
        }

        this.saveToFile();
        this.emitBattleUpdate(id);
        this.emitBattleListUpdate();
        return battle;
    }

    updateBattle(
        battleId: string,
        {
            name,
            mode,
            mapSize,
            sceneDescription,
        }: {
            name?: string;
            mode?: BattleMode;
            mapSize?: { width: number; height: number };
            sceneDescription?: string;
        },
    ): BattleState {
        const battle = this.battles.get(battleId);
        if (!battle) {
            logger.error(`Battle with ID ${battleId} not found`);
            logger.info(`All battle IDs:`, Array.from(this.battles.keys()));
            throw new Error("Battle not found");
        }

        if (name !== undefined) battle.name = name;
        if (mode !== undefined) {
            battle.mode = mode;

            if (mode === "GridBased") {
                if (!battle.map) {
                    const width = mapSize?.width || 25;
                    const height = mapSize?.height || 25;
                    battle.map = createEmptyMap(
                        width,
                        height,
                        `Battle map for ${name}`,
                    );
                } else {
                    // We have an existing map, but the user might want to resize it
                    if (mapSize) {
                        battle.map.width = mapSize.width;
                        battle.map.height = mapSize.height;
                        // Extend the cells arrays if needed
                        for (let y = 0; y < mapSize.height; y++) {
                            if (!battle.map.cells[y]) {
                                battle.map.cells[y] = [];
                            }
                            for (let x = 0; x < mapSize.width; x++) {
                                if (!battle.map.cells[y][x]) {
                                    battle.map.cells[y][x] = {
                                        x,
                                        y,
                                        terrain: "Empty",
                                    };
                                }
                            }
                        }
                    }

                    // Automatically register the map to the default campaign
                    try {
                        this.campaignStore.addMapToDefaultCampaign(
                            battle.map,
                            battle,
                        );
                    } catch (error) {
                        logger.warn(
                            "Failed to register map to default campaign:",
                            error,
                        );
                    }
                }
                // Reposition creatures if needed
                for (const creature of battle.creatures) {
                    if (
                        creature.position &&
                        battle.map &&
                        !canCreatureOccupyPosition(
                            battle.map,
                            creature.position,
                            creature.size,
                            creature.id,
                            battle.creatures,
                        ).canOccupy
                    ) {
                        // Find first available position
                        const newPos = this.findFirstAvailablePosition(
                            battle.map,
                            creature.size,
                            battle.creatures.filter(
                                (c) => c.id !== creature.id,
                            ),
                        );
                        // If no position found, remove position (will need manual placement)
                        logger.warn(
                            `No valid position found for creature ${creature.id}. Manual placement required.`,
                        );
                        creature.position = newPos || undefined;
                    }
                }
            } else {
                // For Theatre of Mind, nothing should need to change.
                // Keep the map in-case the user switches back later (i.e. if
                // this update was accidental).
                battle.sceneDescription = sceneDescription;
                battle.creaturePositions = undefined;
            }
        }

        this.saveToFile();
        this.emitBattleUpdate(battleId);
        return battle;
    }

    getBattle(id: string): BattleState | null {
        return this.battles.get(id) || null;
    }

    getAllBattles(): BattleSummary[] {
        return Array.from(this.battles.values()).map((battle) => ({
            id: battle.id,
            name: battle.name,
            mode: battle.mode,
            creatureCount: battle.creatures.length,
            status: battle.isActive ? "active" : "inactive",
        }));
    }

    addCreature(battleId: string, creature: Creature): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        // For grid-based battles, validate position if provided
        if (battle.mode === "GridBased" && battle.map && creature.position) {
            const positionCheck = canCreatureOccupyPosition(
                battle.map,
                creature.position,
                creature.size,
                undefined,
                battle.creatures,
            );
            if (!positionCheck.canOccupy) {
                throw new Error(
                    `Cannot place creature at position: ${positionCheck.reason}`,
                );
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
            this.campaignStore.addCreatureToDefaultCampaign(
                newCreature,
                battle,
            );
        } catch (error) {
            logger.warn(
                "Failed to register creature to default campaign:",
                error,
            );
        }

        this.saveToFile();
        this.emitBattleUpdate(battleId);
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

        this.saveToFile();
        this.emitBattleUpdate(battleId);
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
        const oldLength = battle.creatures.length;
        battle.creatures = battle.creatures.filter((c) => c.id !== creatureId);
        if (battle.creatures.length === oldLength) {
            // No creature was removed
            return null;
        }
        battle.history.push(action);

        this.saveToFile();
        this.emitBattleUpdate(battleId);
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

        this.saveToFile();
        return battle;
    }

    undo(battleId: string): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle || battle.history.length === 0) return null;

        const lastAction = battle.history.pop()!;
        if (lastAction.previousState) {
            Object.assign(battle, lastAction.previousState);
        }

        this.saveToFile();
        this.emitBattleUpdate(battleId);
        return battle;
    }

    startBattle(battleId: string): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        battle.isActive = true;
        battle.currentTurn = 0;
        battle.round = 1;

        this.saveToFile();
        this.emitBattleUpdate(battleId);
        return battle;
    }

    // Map-specific methods

    moveCreature(
        battleId: string,
        creatureId: string,
        data: { position: GridPosition },
    ): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        // Only grid-based battles support movement
        if (battle.mode !== "GridBased" || !battle.map) {
            throw new ImpossibleCommandError(
                "Movement is only supported in grid-based battles",
            );
        }

        const creatureIndex = battle.creatures.findIndex(
            (c) => c.id === creatureId,
        );
        if (creatureIndex === -1) return null;

        const creature = battle.creatures[creatureIndex];
        const { position } = data;

        // Validate the new position
        const positionCheck = canCreatureOccupyPosition(
            battle.map,
            position,
            creature.size,
            creatureId,
            battle.creatures,
        );
        if (!positionCheck.canOccupy) {
            throw new ImpossibleCommandError(
                `Cannot move creature to position: ${positionCheck.reason}`,
            );
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
            position,
        };
        battle.history.push(action);

        this.saveToFile();
        this.emitBattleUpdate(battleId);
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
        },
    ): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        // Only grid-based battles have maps
        if (battle.mode !== "GridBased" || !battle.map) {
            throw new Error(
                "Terrain modification is only supported in grid-based battles",
            );
        }

        const { positions, terrain, doorOpen, elevation, hazardDamage } = data;

        console.error("Data is:", data);
        console.error("Positions is:", positions);

        // Validate all positions are within map bounds
        for (const pos of positions) {
            if (!isValidPosition(battle.map, pos)) {
                throw new Error(
                    `Position (${pos.x}, ${pos.y}) is outside map bounds`,
                );
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
                    cells: battle.map.cells.map((row) => [...row]),
                },
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

    toggleDoor(
        battleId: string,
        data: { position: GridPosition },
    ): BattleState | null {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        if (battle.mode !== "GridBased" || !battle.map) {
            throw new Error(
                "Door manipulation is only supported in grid-based battles",
            );
        }

        const { position } = data;

        if (!isValidPosition(battle.map, position)) {
            throw new Error(
                `Position (${position.x}, ${position.y}) is outside map bounds`,
            );
        }

        const cell = getMapCell(battle.map, position);
        if (!cell || cell.terrain !== "Door") {
            throw new Error("No door at specified position");
        }

        const action: BattleAction = {
            id: (++this.actionIdCounter).toString(),
            timestamp: Date.now(),
            type: "TOGGLE_DOOR",
            data: { position },
            previousState: {
                map: {
                    ...battle.map,
                    cells: battle.map.cells.map((row) => [...row]),
                },
            },
        };

        // Toggle door state
        cell.doorOpen = !cell.doorOpen;

        battle.history.push(action);
        return battle;
    }

    // Helper method to find first available position on grid
    private findFirstAvailablePosition(
        map: BattleMap,
        creatureSize: CreatureSize,
        existingCreatures: Creature[],
    ): GridPosition | null {
        // Search from top-left to bottom-right, row by row
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const position = { x, y };
                const positionCheck = canCreatureOccupyPosition(
                    map,
                    position,
                    creatureSize,
                    undefined,
                    existingCreatures,
                );
                if (positionCheck.canOccupy) {
                    return position;
                }
            }
        }
        return null; // No available position found
    }

    // Campaign integration methods

    addCreatureFromCampaign(
        battleId: string,
        campaignCreatureId: string,
        position?: GridPosition,
    ): BattleState | null {
        logger.debug("=== addCreatureFromCampaign called ===");
        logger.debug("battleId:", battleId);
        logger.debug("campaignCreatureId:", campaignCreatureId);
        logger.debug("position:", position);
        logger.debug("position type:", typeof position);
        logger.debug("position === undefined:", position === undefined);
        logger.debug("position === null:", position === null);

        const battle = this.battles.get(battleId);
        if (!battle) return null;

        logger.debug("Battle mode:", battle.mode);
        logger.debug("Battle has map:", !!battle.map);

        let finalPosition: GridPosition | null | undefined = position;

        // For grid-based battles, auto-find position if not provided
        if (
            battle.mode === "GridBased" &&
            battle.map &&
            (finalPosition === undefined || finalPosition === null)
        ) {
            const campaignCreature =
                this.campaignStore.getCampaignCreature(campaignCreatureId);
            const creatureSize = campaignCreature?.template.size || "Medium";
            logger.debug(
                `Auto-placing ${
                    campaignCreature?.name || "creature"
                } (${creatureSize}) on ${battle.map.width}x${
                    battle.map.height
                } grid with ${battle.creatures.length} existing creatures`,
            );

            finalPosition = this.findFirstAvailablePosition(
                battle.map,
                creatureSize,
                battle.creatures,
            );

            logger.debug(`Found position:`, finalPosition);

            if (!finalPosition) {
                throw new Error(
                    "No available position found on the map for this creature",
                );
            }
        }

        const creature = this.campaignStore.createCreatureFromCampaign(
            campaignCreatureId,
            finalPosition,
        );
        if (!creature) return null;

        // For grid-based battles, validate position if provided
        if (battle.mode === "GridBased" && battle.map && creature.position) {
            const positionCheck = canCreatureOccupyPosition(
                battle.map,
                creature.position,
                creature.size,
                undefined,
                battle.creatures,
            );
            if (!positionCheck.canOccupy) {
                throw new Error(
                    `Cannot place creature at position: ${positionCheck.reason}`,
                );
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

        this.saveToFile();
        this.emitBattleUpdate(battleId);
        return battle;
    }

    // Theatre of Mind description methods

    updateSceneDescription(
        battleId: string,
        data: { description: string },
    ): BattleState | null {
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

        this.saveToFile();
        this.emitBattleUpdate(battleId);
        return battle;
    }

    updateCreaturePositions(
        battleId: string,
        data: { positions: string },
    ): BattleState | null {
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

        this.saveToFile();
        this.emitBattleUpdate(battleId);
        return battle;
    }

    // Test utility method to clear all battles
    clearAllBattles(): void {
        this.battles.clear();
        this.actionIdCounter = 0;
    }
}
