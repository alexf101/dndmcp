import { useState, useEffect } from "react";
import styled from "styled-components";

const RollerContainer = styled.div`
    border: 1px solid ${({ theme }) => theme.colors.interactive.border};
    border-radius: ${({ theme }) => theme.radii.lg};
    padding: ${({ theme }) => theme.spacing.lg};
    background: ${({ theme }) => theme.colors.background.surface};
`;

const RollButton = styled.button`
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.background.body};
    border: none;
    border-radius: ${({ theme }) => theme.radii.base};
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
    cursor: pointer;
    
    &:hover {
        background: ${({ theme }) => theme.colors.primaryHover};
    }
`;

interface DiceRoll {
    id: string;
    notation: string;
    rolls: number[];
    total: number;
    modifier: number;
    description?: string;
    timestamp: number;
}

interface DiceRollerProps {
    onRegisterRollHandler?: (handler: (roll: DiceRoll) => void) => void;
}

export default function DiceRoller({ onRegisterRollHandler }: DiceRollerProps = {}) {
    const [notation, setNotation] = useState("1d20");
    const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);

    useEffect(() => {
        if (onRegisterRollHandler) {
            onRegisterRollHandler((roll: DiceRoll) => {
                setLastRoll(roll);
            });
        }
    }, [onRegisterRollHandler]);

    const handleRoll = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/dice/roll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notation, modifier: 0 }),
            });
            const roll = await response.json();
            setLastRoll(roll);
        } catch (error) {
            console.error("Failed to roll dice:", error);
        }
    };

    return (
        <RollerContainer>
            <h3>🎲 Dice Roller</h3>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input
                    type="text"
                    value={notation}
                    onChange={(e) => setNotation(e.target.value)}
                    placeholder="1d20"
                    style={{ flex: 1, padding: "8px" }}
                />
                <RollButton onClick={handleRoll}>Roll</RollButton>
            </div>
            {lastRoll && (
                <div style={{ padding: "12px", background: "#1a1a1a", borderRadius: "4px" }}>
                    <div><strong>Total:</strong> {lastRoll.total}</div>
                    <div><strong>Rolls:</strong> {lastRoll.rolls.join(", ")}</div>
                </div>
            )}
        </RollerContainer>
    );
}
