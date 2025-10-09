import { useState } from "react";
import styled from "styled-components";
import type {
    BattleState,
    MapCell,
    TerrainType,
    Creature,
    CreatureSize,
} from "../types";
import { TERRAIN_INFO, CREATURE_SIZE_INFO } from "../types";
import CreatureTooltip from "./CreatureTooltip";

const MapContainer = styled.div`
    border: 1px solid ${({ theme }) => theme.colors.interactive.border};
    border-radius: ${({ theme }) => theme.radii.lg};
    padding: ${({ theme }) => theme.spacing.lg};
    background: ${({ theme }) => theme.colors.background.surface};

    h3 {
        margin-top: 0;
        margin-bottom: ${({ theme }) => theme.spacing.md};
        color: ${({ theme }) => theme.colors.primary};
    }
`;

const MapGrid = styled.div<{ width: number; height: number }>`
    display: grid;
    grid-template-columns: repeat(${(props) => props.width}, 1fr);
    grid-template-rows: repeat(${(props) => props.height}, 1fr);
    gap: 1px;
    background: ${({ theme }) => theme.colors.interactive.border};
    border: 2px solid ${({ theme }) => theme.colors.interactive.border};
    max-width: 100%;
    aspect-ratio: ${(props) => props.width / props.height};
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const MapCell = styled.div<{
    terrain: TerrainType;
    hasCreature: boolean;
    isCreatureCenter: boolean;
    creatureSize?: CreatureSize;
    isDoorOpen?: boolean;
}>`
    position: relative;
    aspect-ratio: 1;
    min-width: 20px;
    min-height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;

    ${(props) => {
        switch (props.terrain) {
            case "Empty":
                return `background: #f8f9fa;`;
            case "Wall":
                return `background: #495057; color: white;`;
            case "DifficultTerrain":
                return `background: #8d5524; color: white;`;
            case "Water":
                return `background: #0077be; color: white;`;
            case "Pit":
                return `background: #2b2b2b; color: white;`;
            case "Door":
                return `background: ${
                    props.isDoorOpen ? "#6c757d" : "#495057"
                }; color: white;`;
            case "Window":
                return `background: #adb5bd; color: black;`;
            case "Cover":
                return `background: #6f5533; color: white;`;
            case "HeavyCover":
                return `background: #4a3324; color: white;`;
            case "Stairs":
                return `background: #e9ecef; color: black;`;
            case "Hazard":
                return `background: #dc3545; color: white;`;
            default:
                return `background: #f8f9fa;`;
        }
    }}

    ${(props) =>
        props.hasCreature &&
        props.isCreatureCenter &&
        `
    border: 2px solid #007bff;
    background: linear-gradient(45deg, ${
        props.creatureSize === "Large" ||
        props.creatureSize === "Huge" ||
        props.creatureSize === "Gargantuan"
            ? "rgba(0, 123, 255, 0.3)"
            : "rgba(0, 123, 255, 0.5)"
    }, transparent);
  `}

  ${(props) =>
        props.hasCreature &&
        !props.isCreatureCenter &&
        `
    background: linear-gradient(45deg, rgba(0, 123, 255, 0.2), transparent);
  `}
`;

const CreatureToken = styled.div<{ size: CreatureSize; isPlayer: boolean }>`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    font-weight: bold;
    z-index: 10;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.2s ease;

    ${(props) => {
        const size = CREATURE_SIZE_INFO[props.size].gridSize;
        const dimension = `${Math.min(size * 18, 18)}px`;
        return `
      width: ${dimension};
      height: ${dimension};
    `;
    }}

    ${(props) =>
        props.isPlayer
            ? `background: #28a745; color: ${
                  props.theme?.colors?.text?.primary || "white"
              }; border: 2px solid ${
                  props.theme?.colors?.text?.primary || "white"
              };`
            : `background: #dc3545; color: ${
                  props.theme?.colors?.text?.primary || "white"
              }; border: 2px solid ${
                  props.theme?.colors?.text?.primary || "white"
              };`}

  &:hover {
        transform: translate(-50%, -50%) scale(1.1);
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
    }
`;

const Legend = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.typography.sizes.sm};
`;

const LegendItem = styled.div<{ terrain: TerrainType; isDoorOpen?: boolean }>`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    color: ${({ theme }) => theme.colors.text.primary};

    .color-box {
        width: 16px;
        height: 16px;
        border: 1px solid ${({ theme }) => theme.colors.interactive.border};
        flex-shrink: 0;

        ${(props) => {
            switch (props.terrain) {
                case "Empty":
                    return `background: #f8f9fa;`;
                case "Wall":
                    return `background: #495057;`;
                case "DifficultTerrain":
                    return `background: #8d5524;`;
                case "Water":
                    return `background: #0077be;`;
                case "Pit":
                    return `background: #2b2b2b;`;
                case "Door":
                    return `background: ${
                        props.isDoorOpen ? "#6c757d" : "#495057"
                    };`;
                case "Window":
                    return `background: #adb5bd;`;
                case "Cover":
                    return `background: #6f5533;`;
                case "HeavyCover":
                    return `background: #4a3324;`;
                case "Stairs":
                    return `background: #e9ecef;`;
                case "Hazard":
                    return `background: #dc3545;`;
                default:
                    return `background: #f8f9fa;`;
            }
        }}
    }
`;

const NoMapMessage = styled.div`
    text-align: center;
    color: ${({ theme }) => theme.colors.text.secondary};
    padding: ${({ theme }) => theme.spacing.xl};
    font-style: italic;
`;

interface BattleMapVisualizationProps {
    battle: BattleState | null;
}

export default function BattleMapVisualization({
    battle,
}: BattleMapVisualizationProps) {
    const [tooltipState, setTooltipState] = useState<{
        creature: Creature | null;
        x: number;
        y: number;
        visible: boolean;
    }>({
        creature: null,
        x: 0,
        y: 0,
        visible: false,
    });

    const handleCreatureClick = (
        creature: Creature,
        event: React.MouseEvent,
    ) => {
        event.stopPropagation();
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setTooltipState({
            creature,
            x: rect.right + 10,
            y: rect.top,
            visible: true,
        });
    };

    const handleCloseTooltip = () => {
        setTooltipState((prev) => ({ ...prev, visible: false }));
    };

    if (!battle) {
        return (
            <MapContainer>
                <h3>🗺️ Battle Map</h3>
                <NoMapMessage>No battle selected</NoMapMessage>
            </MapContainer>
        );
    }

    if (battle.mode !== "GridBased" || !battle.map) {
        return (
            <MapContainer>
                <h3>🗺️ Battle Map</h3>
                <NoMapMessage>
                    {battle.mode === "TheatreOfMind"
                        ? "This battle uses Theatre of Mind mode"
                        : "No map available for this battle"}
                </NoMapMessage>
            </MapContainer>
        );
    }

    const map = battle.map;

    // Create a map of creature positions for efficient lookup
    const creaturePositions = new Map<string, Creature>();
    const occupiedPositions = new Set<string>();

    battle.creatures.forEach((creature) => {
        if (creature.position) {
            const posKey = `${creature.position.x},${creature.position.y}`;
            creaturePositions.set(posKey, creature);

            // Mark all cells occupied by large creatures
            const gridSize = CREATURE_SIZE_INFO[creature.size].gridSize;
            for (let dx = 0; dx < gridSize; dx++) {
                for (let dy = 0; dy < gridSize; dy++) {
                    const occupiedKey = `${creature.position.x + dx},${
                        creature.position.y + dy
                    }`;
                    occupiedPositions.add(occupiedKey);
                }
            }
        }
    });

    // Get unique terrain types used in the map
    const usedTerrains = new Set<TerrainType>();
    const doorStates = new Map<string, boolean>();

    map.cells.forEach((row) => {
        row.forEach((cell) => {
            usedTerrains.add(cell.terrain);
            if (cell.terrain === "Door") {
                doorStates.set(`${cell.x},${cell.y}`, cell.doorOpen || false);
            }
        });
    });

    return (
        <MapContainer>
            <h3>
                🗺️ Battle Map ({map.width}×{map.height})
            </h3>

            <MapGrid width={map.width} height={map.height}>
                {map.cells.flat().map((cell) => {
                    const posKey = `${cell.x},${cell.y}`;
                    const creature = creaturePositions.get(posKey);
                    const hasCreature = occupiedPositions.has(posKey);
                    const isCreatureCenter = creature !== undefined;

                    return (
                        <MapCell
                            key={`${cell.x}-${cell.y}`}
                            terrain={cell.terrain}
                            hasCreature={hasCreature}
                            isCreatureCenter={isCreatureCenter}
                            creatureSize={creature?.size}
                            isDoorOpen={cell.doorOpen}
                        >
                            {/* Show terrain symbols for special terrain */}
                            {cell.terrain === "Wall" && "🧱"}
                            {cell.terrain === "Water" && "🌊"}
                            {cell.terrain === "Door" &&
                                (cell.doorOpen ? "🚪" : "🔒")}
                            {cell.terrain === "Stairs" && "📐"}
                            {cell.terrain === "Pit" && "🕳️"}
                            {cell.terrain === "Hazard" && "⚠️"}
                            {cell.terrain === "Cover" && "🛡️"}
                            {cell.terrain === "HeavyCover" && "🏰"}

                            {/* Show creature token if this is the creature's center position */}
                            {creature && isCreatureCenter && (
                                <CreatureToken
                                    size={creature.size}
                                    isPlayer={creature.isPlayer}
                                    onClick={(e) =>
                                        handleCreatureClick(creature, e)
                                    }
                                >
                                    {creature.name.slice(0, 2).toUpperCase()}
                                </CreatureToken>
                            )}
                        </MapCell>
                    );
                })}
            </MapGrid>

            {/* Legend */}
            <Legend>
                {Array.from(usedTerrains).map((terrain) => (
                    <LegendItem
                        key={terrain}
                        terrain={terrain}
                        isDoorOpen={
                            terrain === "Door"
                                ? Array.from(doorStates.values())[0]
                                : undefined
                        }
                    >
                        <div className="color-box" />
                        <span>{TERRAIN_INFO[terrain].description}</span>
                    </LegendItem>
                ))}

                {battle.creatures.length > 0 && (
                    <>
                        <LegendItem terrain="Empty">
                            <div
                                className="color-box"
                                style={{
                                    background: "#28a745",
                                    borderRadius: "50%",
                                }}
                            />
                            <span>Player Characters</span>
                        </LegendItem>
                        <LegendItem terrain="Empty">
                            <div
                                className="color-box"
                                style={{
                                    background: "#dc3545",
                                    borderRadius: "50%",
                                }}
                            />
                            <span>NPCs/Enemies</span>
                        </LegendItem>
                    </>
                )}
            </Legend>

            <CreatureTooltip
                creature={tooltipState.creature}
                x={tooltipState.x}
                y={tooltipState.y}
                visible={tooltipState.visible}
                onClose={handleCloseTooltip}
            />
        </MapContainer>
    );
}
