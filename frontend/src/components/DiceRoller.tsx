import { useState, useEffect } from "react";
import styled from "styled-components";
import { postApiDiceRoll } from "../api/dice/dice";
import type { PostApiDiceRoll200 } from "../api/generated.schemas";

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

const TypeSafeBadge = styled.div`
    display: inline-block;
    background: ${({ theme }) => theme.colors.status.success};
    color: ${({ theme }) => theme.colors.text.primary};
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    margin-left: 8px;
`;

interface DiceRollerProps {
    onRegisterRollHandler?: (handler: (roll: PostApiDiceRoll200) => void) => void;
}

export default function DiceRoller({ onRegisterRollHandler }: DiceRollerProps = {}) {
    const [notation, setNotation] = useState("1d20");
    const [description, setDescription] = useState("");
    const [lastRoll, setLastRoll] = useState<PostApiDiceRoll200 | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (onRegisterRollHandler) {
            onRegisterRollHandler((roll: PostApiDiceRoll200) => {
                setLastRoll(roll);
            });
        }
    }, [onRegisterRollHandler]);

    const handleRoll = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Using the type-safe generated API client!
            const response = await postApiDiceRoll({
                notation,
                modifier: 0,
                description: description || undefined,
            });

            if (response.status === 200) {
                // response.data is fully typed as PostApiDiceRoll200
                setLastRoll(response.data);
            } else if (response.status === 400) {
                setError(response.data.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to roll dice");
        } finally {
            setLoading(false);
        }
    };

    return (
        <RollerContainer>
            <h3>
                🎲 Dice Roller
                <TypeSafeBadge>Type-Safe API ✓</TypeSafeBadge>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                <input
                    type="text"
                    value={notation}
                    onChange={(e) => setNotation(e.target.value)}
                    placeholder="1d20, 2d6+3, 2d20kh1"
                    style={{ padding: "8px" }}
                />
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    style={{ padding: "8px" }}
                />
                <RollButton onClick={handleRoll} disabled={loading}>
                    {loading ? "Rolling..." : "Roll"}
                </RollButton>
            </div>
            {error && (
                <div style={{ 
                    padding: "12px", 
                    background: "#3d1f1f", 
                    color: "#ff6b6b",
                    borderRadius: "4px",
                    marginBottom: "12px"
                }}>
                    ❌ {error}
                </div>
            )}
            {lastRoll && (
                <div style={{ padding: "12px", background: "#1a1a1a", borderRadius: "4px" }}>
                    <div><strong>Total:</strong> {lastRoll.total}</div>
                    <div><strong>Rolls:</strong> {lastRoll.rolls.join(", ")}</div>
                    <div><strong>Notation:</strong> {lastRoll.notation}</div>
                    {lastRoll.description && (
                        <div><strong>Description:</strong> {lastRoll.description}</div>
                    )}
                    <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "8px" }}>
                        ID: {lastRoll.id}
                    </div>
                </div>
            )}
        </RollerContainer>
    );
}
