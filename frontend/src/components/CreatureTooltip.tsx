import { useState, useEffect } from "react";
import styled from "styled-components";
import type { Creature } from "../types";

const TooltipContainer = styled.div<{ x: number; y: number; visible: boolean }>`
    position: fixed;
    left: ${(props) => props.x}px;
    top: ${(props) => props.y}px;
    background: ${({ theme }) => theme.colors.background.surface};
    border: 1px solid ${({ theme }) => theme.colors.interactive.border};
    border-radius: ${({ theme }) => theme.radii.lg};
    padding: ${({ theme }) => theme.spacing.md};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    min-width: 250px;
    max-width: 350px;
    opacity: ${(props) => (props.visible ? 1 : 0)};
    transform: ${(props) => (props.visible ? "scale(1)" : "scale(0.95)")};
    // transition: all 0.2s ease;
    pointer-events: ${(props) => (props.visible ? "auto" : "none")};
`;

const CreatureName = styled.h3`
    margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: ${({ theme }) => theme.typography.sizes.lg};
`;

const CreatureId = styled.div`
    font-size: ${({ theme }) => theme.typography.sizes.xs};
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const CopyButton = ({ value }: { value: string }) => (
    <CopyButton_
        title="copy ID"
        onClick={() => navigator.clipboard.writeText(value)}
    >
        📋{/* clipboard emoji */}
    </CopyButton_>
);

const CopyButton_ = styled.button`
    margin-left: ${({ theme }) => theme.spacing.xs};
    font-size: 0.8em;
    cursor: pointer;
    background: none;
    border: none;
    color: inherit;

    &:hover {
        color: ${({ theme }) => theme.colors.primary};
    }
`;

const CreatureType = styled.div`
    display: inline-block;
    padding: ${({ theme }) => theme.spacing.xs}
        ${({ theme }) => theme.spacing.sm};
    background: ${({ theme }) => theme.colors.background.input};
    border-radius: ${({ theme }) => theme.radii.base};
    font-size: ${({ theme }) => theme.typography.sizes.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const StatGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: ${({ theme }) => theme.spacing.sm};
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const StatItem = styled.div`
    text-align: center;
    padding: ${({ theme }) => theme.spacing.xs};
    background: ${({ theme }) => theme.colors.background.input};
    border-radius: ${({ theme }) => theme.radii.base};

    .label {
        font-size: ${({ theme }) => theme.typography.sizes.sm};
        color: ${({ theme }) => theme.colors.text.tertiary};
        display: block;
    }

    .value {
        font-size: ${({ theme }) => theme.typography.sizes.lg};
        font-weight: bold;
        color: ${({ theme }) => theme.colors.text.primary};
    }
`;

const AbilityScores = styled.div`
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: ${({ theme }) => theme.spacing.xs};
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const AbilityScore = styled.div`
    text-align: center;
    padding: ${({ theme }) => theme.spacing.xs};
    background: ${({ theme }) => theme.colors.background.input};
    border-radius: ${({ theme }) => theme.radii.base};

    .ability {
        font-size: ${({ theme }) => theme.typography.sizes.xs};
        color: ${({ theme }) => theme.colors.text.tertiary};
        text-transform: uppercase;
    }

    .score {
        font-size: ${({ theme }) => theme.typography.sizes.sm};
        font-weight: bold;
        color: ${({ theme }) => theme.colors.text.primary};
    }
`;

const StatusEffects = styled.div`
    margin-top: ${({ theme }) => theme.spacing.sm};

    .title {
        font-size: ${({ theme }) => theme.typography.sizes.sm};
        color: ${({ theme }) => theme.colors.text.secondary};
        margin-bottom: ${({ theme }) => theme.spacing.xs};
    }

    .effects {
        display: flex;
        flex-wrap: wrap;
        gap: ${({ theme }) => theme.spacing.xs};
    }

    .effect {
        padding: ${({ theme }) => theme.spacing.xs}
            ${({ theme }) => theme.spacing.sm};
        background: ${({ theme }) => theme.colors.error.background};
        color: ${({ theme }) => theme.colors.error.text};
        border-radius: ${({ theme }) => theme.radii.base};
        font-size: ${({ theme }) => theme.typography.sizes.sm};
    }
`;

const Position = styled.div`
    margin-top: ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.typography.sizes.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
`;

interface CreatureTooltipProps {
    creature: Creature | null;
    x: number;
    y: number;
    visible: boolean;
    onClose: () => void;
}

export default function CreatureTooltip({
    creature,
    x,
    y,
    visible,
    onClose,
}: CreatureTooltipProps) {
    const [adjustedX, setAdjustedX] = useState(x);
    const [adjustedY, setAdjustedY] = useState(y);

    useEffect(() => {
        if (!visible || !creature) return;

        // Adjust position to keep tooltip on screen
        const padding = 20;
        const tooltipWidth = 350;
        const tooltipHeight = 400;

        let newX = x;
        let newY = y;

        if (x + tooltipWidth > window.innerWidth - padding) {
            newX = x - tooltipWidth - padding;
        }
        if (y + tooltipHeight > window.innerHeight - padding) {
            newY = y - tooltipHeight - padding;
        }

        setAdjustedX(Math.max(padding, newX));
        setAdjustedY(Math.max(padding, newY));
    }, [x, y, visible, creature]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest("[data-creature-tooltip]")) {
                onClose();
            }
        };

        if (visible) {
            document.addEventListener("keydown", handleEscape);
            document.addEventListener("click", handleClickOutside);
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.removeEventListener("click", handleClickOutside);
        };
    }, [visible, onClose]);

    if (!creature) return null;

    const getModifier = (score: number) => Math.floor((score - 10) / 2);
    const formatModifier = (modifier: number) =>
        modifier >= 0 ? `+${modifier}` : `${modifier}`;

    return (
        <TooltipContainer
            x={adjustedX}
            y={adjustedY}
            visible={visible}
            data-creature-tooltip
        >
            <CreatureName>{creature.name}</CreatureName>
            <CreatureId>
                {creature.id}
                <CopyButton value={creature.id} />
            </CreatureId>

            <CreatureType>
                {creature.size} {creature.isPlayer ? "Player Character" : "NPC"}
                {creature.position &&
                    ` at (${creature.position.x}, ${creature.position.y})`}
            </CreatureType>

            <StatGrid>
                <StatItem>
                    <span className="label">HP</span>
                    <span className="value">
                        {creature.hp}/{creature.maxHp}
                    </span>
                </StatItem>
                <StatItem>
                    <span className="label">AC</span>
                    <span className="value">{creature.ac}</span>
                </StatItem>
                <StatItem>
                    <span className="label">Initiative</span>
                    <span className="value">{creature.initiative}</span>
                </StatItem>
            </StatGrid>

            <AbilityScores>
                <AbilityScore>
                    <div className="ability">STR</div>
                    <div className="score">{creature.stats.str}</div>
                    <div className="modifier">
                        ({formatModifier(getModifier(creature.stats.str))})
                    </div>
                </AbilityScore>
                <AbilityScore>
                    <div className="ability">DEX</div>
                    <div className="score">{creature.stats.dex}</div>
                    <div className="modifier">
                        ({formatModifier(getModifier(creature.stats.dex))})
                    </div>
                </AbilityScore>
                <AbilityScore>
                    <div className="ability">CON</div>
                    <div className="score">{creature.stats.con}</div>
                    <div className="modifier">
                        ({formatModifier(getModifier(creature.stats.con))})
                    </div>
                </AbilityScore>
                <AbilityScore>
                    <div className="ability">INT</div>
                    <div className="score">{creature.stats.int}</div>
                    <div className="modifier">
                        ({formatModifier(getModifier(creature.stats.int))})
                    </div>
                </AbilityScore>
                <AbilityScore>
                    <div className="ability">WIS</div>
                    <div className="score">{creature.stats.wis}</div>
                    <div className="modifier">
                        ({formatModifier(getModifier(creature.stats.wis))})
                    </div>
                </AbilityScore>
                <AbilityScore>
                    <div className="ability">CHA</div>
                    <div className="score">{creature.stats.cha}</div>
                    <div className="modifier">
                        ({formatModifier(getModifier(creature.stats.cha))})
                    </div>
                </AbilityScore>
            </AbilityScores>

            {creature.statusEffects.length > 0 && (
                <StatusEffects>
                    <div className="title">Status Effects:</div>
                    <div className="effects">
                        {creature.statusEffects.map((effect, index) => (
                            <div key={index} className="effect">
                                {effect.name}
                                {effect.duration && ` (${effect.duration})`}
                            </div>
                        ))}
                    </div>
                </StatusEffects>
            )}
        </TooltipContainer>
    );
}
