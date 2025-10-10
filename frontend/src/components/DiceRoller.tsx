import { useState, useEffect, useCallback } from "react";
import styled from "styled-components";

const RollerContainer = styled.div`
    border: 1px solid ${({ theme }) => theme.colors.interactive.border};
    border-radius: ${({ theme }) => theme.radii.lg};
    padding: ${({ theme }) => theme.spacing.lg};
    background: ${({ theme }) => theme.colors.background.surface};
    margin-bottom: ${({ theme }) => theme.spacing.lg};

    h3 {
        margin-top: 0;
        margin-bottom: ${({ theme }) => theme.spacing.md};
        color: ${({ theme }) => theme.colors.primary};
    }
`;

const RollerForm = styled.form`
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.sm};
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
    font-size: ${({ theme }) => theme.typography.sizes.sm};
    color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Input = styled.input`
    background: ${({ theme }) => theme.colors.background.input};
    color: ${({ theme }) => theme.colors.text.primary};
    border: 1px solid ${({ theme }) => theme.colors.interactive.border};
    border-radius: ${({ theme }) => theme.radii.base};
    padding: ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.typography.sizes.base};

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.interactive.focus};
    }
`;

const RollButton = styled.button`
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.background.body};
    border: none;
    border-radius: ${({ theme }) => theme.radii.base};
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
    font-size: ${({ theme }) => theme.typography.sizes.base};
    font-weight: ${({ theme }) => theme.typography.weights.bold};
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
        background: ${({ theme }) => theme.colors.primaryHover};
    }

    &:disabled {
        background: ${({ theme }) => theme.colors.interactive.disabled};
        cursor: not-allowed;
    }
`;

const QuickRollButtons = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.xs};
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const QuickButton = styled.button`
    background: ${({ theme }) => theme.colors.background.button};
    color: ${({ theme }) => theme.colors.text.primary};
    border: 1px solid ${({ theme }) => theme.colors.interactive.border};
    border-radius: ${({ theme }) => theme.radii.base};
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.typography.sizes.sm};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: ${({ theme }) => theme.colors.background.buttonHover};
        border-color: ${({ theme }) => theme.colors.interactive.borderHover};
    }
`;

const ResultContainer = styled.div`
    border: 1px solid ${({ theme }) => theme.colors.interactive.border};
    border-radius: ${({ theme }) => theme.radii.base};
    padding: ${({ theme }) => theme.spacing.md};
    background: ${({ theme }) => theme.colors.background.body};
`;

const ResultRow = styled.div<{ isLatest?: boolean }>`
    padding: ${({ theme }) => theme.spacing.sm};
    border-bottom: 1px solid ${({ theme }) => theme.colors.interactive.border};
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: ${({ theme }) => theme.typography.sizes.base};
    color: ${({ theme }) => theme.colors.text.secondary};

    ${({ isLatest, theme }) =>
        isLatest &&
        `
        background: ${theme.colors.currentTurn.background};
        border: 1px solid ${theme.colors.currentTurn.border};
        border-radius: ${theme.radii.base};
        margin-bottom: ${theme.spacing.sm};
        font-weight: ${theme.typography.weights.bold};
        color: ${theme.colors.text.primary};
    `}

    &:last-child {
        border-bottom: none;
    }
`;

const ResultDetails = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

const ResultDescription = styled.div`
    font-size: ${({ theme }) => theme.typography.sizes.sm};
    color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ResultNotation = styled.div`
    font-family: ${({ theme }) => theme.typography.families.mono};
    font-size: ${({ theme }) => theme.typography.sizes.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
`;

const ResultTotal = styled.div<{ isLatest?: boolean }>`
    font-size: ${({ isLatest, theme }) =>
        isLatest ? "1.5rem" : theme.typography.sizes.lg};
    font-weight: ${({ theme }) => theme.typography.weights.bold};
    color: ${({ theme }) => theme.colors.primary};
`;

const NoResults = styled.div`
    text-align: center;
    color: ${({ theme }) => theme.colors.text.muted};
    padding: ${({ theme }) => theme.spacing.md};
    font-style: italic;
`;

interface DiceRoll {
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
    const [modifier, setModifier] = useState("");
    const [description, setDescription] = useState("");
    const [rolls, setRolls] = useState<DiceRoll[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load roll history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const response = await fetch("http://localhost:8000/api/dice/rolls?limit=10");
                const data = await response.json();
                if (data.success && Array.isArray(data.data)) {
                    setRolls(data.data);
                }
            } catch (err) {
                console.error("Failed to load dice roll history:", err);
            }
        };
        loadHistory();
    }, []);

    // Handler for new rolls from SSE
    const handleNewRoll = useCallback((roll: DiceRoll) => {
        setRolls((prev) => {
            // Check if this roll is already in the list (by timestamp)
            const exists = prev.some(r => r.timestamp === roll.timestamp);
            if (exists) return prev;

            return [roll, ...prev].slice(0, 10);
        });
    }, []);

    // Register the handler with parent
    useEffect(() => {
        if (onRegisterRollHandler) {
            onRegisterRollHandler(handleNewRoll);
        }
    }, [onRegisterRollHandler, handleNewRoll]);

    const rollDice = async (
        diceNotation: string,
        mod?: string,
        desc?: string,
    ) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("http://localhost:8000/api/dice/roll", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    dice: diceNotation,
                    modifier: mod ? parseInt(mod) : 0,
                    description: desc || undefined,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || "Failed to roll dice");
                return;
            }

            setRolls((prev) => [data.data, ...prev].slice(0, 10)); // Keep last 10 rolls
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to roll dice");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        rollDice(notation, modifier, description);
    };

    const quickRoll = (dice: string, desc: string) => {
        rollDice(dice, modifier, desc);
    };

    return (
        <RollerContainer>
            <h3>🎲 Dice Roller</h3>

            <RollerForm onSubmit={handleSubmit}>
                <InputGroup>
                    <Label>Dice Notation</Label>
                    <Input
                        type="text"
                        value={notation}
                        onChange={(e) => setNotation(e.target.value)}
                        placeholder="1d20"
                        style={{ width: "100px" }}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Modifier</Label>
                    <Input
                        type="number"
                        value={modifier}
                        onChange={(e) => setModifier(e.target.value)}
                        placeholder="+0"
                        style={{ width: "70px" }}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>Description</Label>
                    <Input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Attack roll"
                        style={{ minWidth: "150px" }}
                    />
                </InputGroup>

                <InputGroup>
                    <Label>&nbsp;</Label>
                    <RollButton type="submit" disabled={loading}>
                        {loading ? "Rolling..." : "Roll"}
                    </RollButton>
                </InputGroup>
            </RollerForm>

            <QuickRollButtons>
                <QuickButton onClick={() => quickRoll("1d20", "d20")}>
                    d20
                </QuickButton>
                <QuickButton onClick={() => quickRoll("1d12", "d12")}>
                    d12
                </QuickButton>
                <QuickButton onClick={() => quickRoll("1d10", "d10")}>
                    d10
                </QuickButton>
                <QuickButton onClick={() => quickRoll("1d8", "d8")}>
                    d8
                </QuickButton>
                <QuickButton onClick={() => quickRoll("1d6", "d6")}>
                    d6
                </QuickButton>
                <QuickButton onClick={() => quickRoll("1d4", "d4")}>
                    d4
                </QuickButton>
                <QuickButton
                    onClick={() => quickRoll("2d20kh1", "Advantage")}
                >
                    Advantage
                </QuickButton>
                <QuickButton
                    onClick={() => quickRoll("2d20kl1", "Disadvantage")}
                >
                    Disadvantage
                </QuickButton>
                <QuickButton
                    onClick={() => quickRoll("4d6kh3", "Ability Score")}
                >
                    Ability Score
                </QuickButton>
            </QuickRollButtons>

            {error && (
                <div
                    style={{
                        color: "#f44336",
                        marginBottom: "1rem",
                        fontSize: "0.9rem",
                    }}
                >
                    Error: {error}
                </div>
            )}

            <ResultContainer>
                {rolls.length === 0 ? (
                    <NoResults>No rolls yet</NoResults>
                ) : (
                    rolls.map((roll, index) => (
                        <ResultRow key={roll.timestamp} isLatest={index === 0}>
                            <ResultDetails>
                                {roll.description && (
                                    <ResultDescription>
                                        {roll.description}
                                    </ResultDescription>
                                )}
                                <ResultNotation>
                                    {roll.notation}
                                    {roll.rolls.length > 1 &&
                                        ` = [${roll.rolls.join(", ")}]`}
                                    {roll.modifier !== 0 &&
                                        ` ${roll.modifier >= 0 ? "+" : ""}${roll.modifier}`}
                                </ResultNotation>
                            </ResultDetails>
                            <ResultTotal isLatest={index === 0}>
                                {roll.total}
                            </ResultTotal>
                        </ResultRow>
                    ))
                )}
            </ResultContainer>
        </RollerContainer>
    );
}
