import { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import type { BattleState, CommandPreset } from "./types";
import { createBattle, getBattle, getAllBattles, executeCommand } from "./api";
import BattleDisplay from "./components/BattleDisplay";
import CommandForm, { type CommandFormRef } from "./components/CommandForm";
import CreatureTable from "./components/CreatureTable";
import CampaignCreatureSearch from "./components/CampaignCreatureSearch";
import BattleMapVisualization from "./components/BattleMapVisualization";
import DiceRoller from "./components/DiceRoller";
import { useSSE, type SSEMessage } from "./hooks/useSSE";

const AppContainer = styled.div`
    max-width: 1400px;
    margin: 0 auto;
    padding: ${({ theme }) => theme.spacing.md};
    font-family: ${({ theme }) => theme.typography.families.sans};
`;

const Header = styled.header`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.md};
    margin-bottom: ${({ theme }) => theme.spacing.xl};
    padding-bottom: ${({ theme }) => theme.spacing.md};
    border-bottom: 2px solid ${({ theme }) => theme.colors.background.surfaceHover};

    h1 {
        margin: 0;
        color: ${({ theme }) => theme.colors.primary};
    }

    select,
    button {
        padding: ${({ theme }) => theme.spacing.sm};
        border: 1px solid ${({ theme }) => theme.colors.interactive.border};
        background: #222;
        color: ${({ theme }) => theme.colors.text.secondary};
        border-radius: ${({ theme }) => theme.radii.base};
    }
`;

const ErrorMessage = styled.div`
    background: ${({ theme }) => theme.colors.error.background};
    color: ${({ theme }) => theme.colors.error.text};
    padding: ${({ theme }) => theme.spacing.md};
    border-radius: ${({ theme }) => theme.radii.base};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    border: 1px solid ${({ theme }) => theme.colors.error.border};
`;

const SSEStatus = styled.div<{ connected: boolean }>`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    padding: ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.radii.base};
    font-size: 0.875rem;
    background: ${({ connected, theme }) =>
        connected ? theme.colors.status.success : theme.colors.status.warning};
    color: ${({ connected, theme }) =>
        connected ? theme.colors.text.primary : theme.colors.text.primary};
    border: 1px solid ${({ connected, theme }) =>
        connected ? theme.colors.status.success : theme.colors.status.warning};

    &::before {
        content: "${({ connected }) => connected ? '🟢' : '🟡'}";
        font-size: 0.75rem;
    }
`;

const LoadingMessage = styled.div`
    background: ${({ theme }) => theme.colors.loading.background};
    color: ${({ theme }) => theme.colors.loading.text};
    padding: ${({ theme }) => theme.spacing.md};
    border-radius: ${({ theme }) => theme.radii.base};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    border: 1px solid ${({ theme }) => theme.colors.loading.border};
`;

const MainContent = styled.div`
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: ${({ theme }) => theme.spacing.xl};
    align-items: start;

    @media (max-width: 1200px) {
        grid-template-columns: 1fr;
    }
`;

const LeftPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xl};
`;

const RightPanel = styled.div`
    position: sticky;
    top: ${({ theme }) => theme.spacing.md};
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.lg};

    @media (max-width: 1200px) {
        position: static;
    }
`;

const COMMAND_PRESETS: CommandPreset[] = [
    {
        name: "Create Grid Battle",
        description: "Create a new grid-based battle with map",
        command: `{
  "type": "CREATE_BATTLE",
  "data": {
    "name": "Dragon's Lair",
    "mode": "GridBased",
    "mapSize": { "width": 20, "height": 15 }
  }
}`,
    },
    {
        name: "Create Theatre Battle",
        description: "Create a new theatre of mind battle",
        command: `{
  "type": "CREATE_BATTLE",
  "data": {
    "name": "Goblin Ambush",
    "mode": "TheatreOfMind",
    "sceneDescription": "A dimly lit forest path with thick undergrowth on both sides..."
  }
}`,
    },
    {
        name: "Add Creature (Grid)",
        description: "Add a creature to a grid-based battle with position",
        command: `{
  "type": "ADD_CREATURE",
  "data": {
    "name": "Goblin Warrior",
    "hp": 7,
    "maxHp": 7,
    "ac": 15,
    "initiative": 12,
    "stats": {
      "str": 8,
      "dex": 14,
      "con": 10,
      "int": 10,
      "wis": 8,
      "cha": 8
    },
    "statusEffects": [],
    "size": "Small",
    "position": { "x": 5, "y": 5 },
    "isPlayer": false
  }
}`,
    },
    {
        name: "Add Large Dragon",
        description: "Add a large dragon to the battle",
        command: `{
  "type": "ADD_CREATURE",
  "data": {
    "name": "Young Red Dragon",
    "hp": 178,
    "maxHp": 178,
    "ac": 18,
    "initiative": 10,
    "stats": {
      "str": 23,
      "dex": 10,
      "con": 21,
      "int": 14,
      "wis": 11,
      "cha": 19
    },
    "statusEffects": [],
    "size": "Large",
    "position": { "x": 10, "y": 8 },
    "isPlayer": false
  }
}`,
    },
    {
        name: "Update HP",
        description: "Update a creature's HP",
        command: `{
  "type": "UPDATE_CREATURE",
  "data": {
    "creatureId": "creature-id-here",
    "updates": {
      "hp": 5
    }
  }
}`,
    },
    {
        name: "Add Status Effect",
        description: "Add a status effect to a creature",
        command: `{
  "type": "UPDATE_CREATURE",
  "data": {
    "creatureId": "creature-id-here",
    "updates": {
      "statusEffects": [
        {
          "name": "Poisoned",
          "description": "Takes poison damage each turn",
          "duration": 3
        }
      ]
    }
  }
}`,
    },
    {
        name: "Next Turn",
        description: "Advance to the next turn",
        command: `{
  "type": "NEXT_TURN",
  "data": {}
}`,
    },
    {
        name: "Start Battle",
        description: "Start the battle",
        command: `{
  "type": "START_BATTLE",
  "data": {}
}`,
    },
    {
        name: "Set Terrain (Walls)",
        description: "Add walls to the map",
        command: `{
  "type": "SET_TERRAIN",
  "data": {
    "positions": [
      { "x": 0, "y": 0 },
      { "x": 1, "y": 0 },
      { "x": 2, "y": 0 }
    ],
    "terrain": "Wall"
  }
}`,
    },
    {
        name: "Move Creature",
        description: "Move a creature to a new position",
        command: `{
  "type": "MOVE_CREATURE",
  "data": {
    "creatureId": "creature-id-here",
    "position": { "x": 8, "y": 10 }
  }
}`,
    },
    {
        name: "Undo Last Action",
        description: "Undo the last action",
        command: `{
  "type": "UNDO",
  "data": {}
}`,
    },
];

function App() {
    const [battles, setBattles] = useState<BattleState[]>([]);
    const [currentBattle, setCurrentBattle] = useState<BattleState | null>(
        null,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [highlightedCreatureId, setHighlightedCreatureId] = useState<string | null>(null);
    const commandFormRef = useRef<CommandFormRef>(null);

    const [diceRollCallback, setDiceRollCallback] = useState<((roll: any) => void) | null>(null);

    // SSE connection for real-time updates
    const handleSSEMessage = useCallback((message: SSEMessage) => {
        switch (message.type) {
            case 'battle_updated':
                if (message.battleState) {
                    // Update current battle if it matches the updated battle
                    if (currentBattle && message.battleId === currentBattle.id) {
                        console.log('🔄 Updating current battle from SSE');
                        setCurrentBattle(message.battleState);
                    }

                    // Update battle in the battles list
                    setBattles(prev =>
                        prev.map(battle =>
                            battle.id === message.battleId ? message.battleState : battle
                        )
                    );
                }
                break;

            case 'battle_list_updated':
                if (message.battles) {
                    console.log('🔄 Updating battle list from SSE');
                    setBattles(message.battles);

                    // If current battle is null but we have battles, select the first one
                    if (!currentBattle && message.battles.length > 0) {
                        setCurrentBattle(message.battles[0]);
                    }
                }
                break;

            case 'dice_rolled':
                if (message.roll && diceRollCallback) {
                    console.log('🎲 Dice roll received from SSE');
                    diceRollCallback(message.roll);
                }
                break;

            case 'connected':
                console.log('🎯 SSE Connected to D&D Battle Manager');
                break;
        }
    }, [currentBattle, diceRollCallback]);

    const { isConnected: sseConnected } = useSSE({
        url: 'http://localhost:8000/api/events',
        battleId: currentBattle?.id,
        onMessage: handleSSEMessage,
        onConnect: () => {
            console.log('✅ SSE Connected for real-time updates');
            setError(null); // Clear any previous SSE errors
        },
        onError: (error) => {
            console.warn('⚠️ SSE Error (will auto-reconnect):', error);
        },
        autoReconnect: true,
        reconnectInterval: 3000,
    });

    const loadBattles = useCallback(async () => {
        try {
            setLoading(true);
            const battlesData = await getAllBattles();
            setBattles(battlesData);
            if (battlesData.length > 0 && !currentBattle) {
                setCurrentBattle(battlesData[0]);
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load battles",
            );
        } finally {
            setLoading(false);
        }
    }, [currentBattle]);

    useEffect(() => {
        loadBattles();
    }, [loadBattles]);

    const handleCreateBattle = async (name: string) => {
        try {
            setLoading(true);
            const newBattle = await createBattle(name);
            setBattles((prev) => [...prev, newBattle]);
            setCurrentBattle(newBattle);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create battle",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteCommand = async (commandJson: string) => {
        if (!currentBattle) {
            // Then the only valid command is CREATE_BATTLE
            try {
                const command = JSON.parse(commandJson);
                if (command.type !== "CREATE_BATTLE") {
                    setError(
                        "No battle selected. Please create a battle first.",
                    );
                    return;
                }
                await handleCreateBattle(command.data.name);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to execute command",
                );
            }
            return;
        }
        try {
            setLoading(true);
            const command = JSON.parse(commandJson);

            const updatedBattle: BattleState = await executeCommand(
                currentBattle.id,
                command,
            );

            setCurrentBattle(updatedBattle);
            setBattles((prev) =>
                prev.map((b) =>
                    b.id === updatedBattle.id ? updatedBattle : b,
                ),
            );
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to execute command",
            );
        } finally {
            setLoading(false);
        }
    };

    const refreshCurrentBattle = async () => {
        if (!currentBattle) return;

        try {
            setLoading(true);
            const updated = await getBattle(currentBattle.id);
            setCurrentBattle(updated);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to refresh battle",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCreatureAdded = (updatedBattle: BattleState) => {
        setCurrentBattle(updatedBattle);
        setBattles((prev) =>
            prev.map((b) =>
                b.id === updatedBattle.id ? updatedBattle : b,
            ),
        );
        setError(null);
    };

    const handleFillCommand = (command: string) => {
        if (commandFormRef.current) {
            commandFormRef.current.fillCommand(command);
        }
    };

    const handleHighlightCreature = (creatureId: string) => {
        setHighlightedCreatureId(creatureId || null);
    };

    return (
        <AppContainer>
            <Header>
                <h1>🗡️ D&D Battle Manager - Debug Interface</h1>
                {battles.length > 0 && (
                    <select
                        value={currentBattle?.id || ""}
                        onChange={(e) => {
                            const battle = battles.find(
                                (b) => b.id === e.target.value,
                            );
                            if (battle) setCurrentBattle(battle);
                        }}
                    >
                        {battles.map((battle) => (
                            <option key={battle.id} value={battle.id}>
                                {battle.name}
                            </option>
                        ))}
                    </select>
                )}
                <button
                    onClick={refreshCurrentBattle}
                    disabled={loading || !currentBattle}
                >
                    Refresh
                </button>
                <SSEStatus connected={sseConnected}>
                    {sseConnected ? 'Live Updates' : 'Connecting...'}
                </SSEStatus>
            </Header>

            {error && <ErrorMessage>❌ Error: {error}</ErrorMessage>}

            {loading && <LoadingMessage>⏳ Loading...</LoadingMessage>}

            <MainContent>
                <LeftPanel>
                    <BattleMapVisualization
                        battle={currentBattle}
                        highlightedCreatureId={highlightedCreatureId}
                    />
                    <BattleDisplay battle={currentBattle} />
                    {currentBattle && (
                        <CreatureTable
                            creatures={currentBattle.creatures}
                            currentTurn={currentBattle.currentTurn}
                            onFillCommand={handleFillCommand}
                            onHighlightCreature={handleHighlightCreature}
                            highlightedCreatureId={highlightedCreatureId}
                        />
                    )}
                </LeftPanel>

                <RightPanel>
                    <DiceRoller
                        onRegisterRollHandler={(handler) => {
                            setDiceRollCallback(() => handler);
                        }}
                    />
                    <CampaignCreatureSearch
                        currentBattle={currentBattle}
                        onCreatureAdded={handleCreatureAdded}
                        disabled={loading}
                    />
                    <CommandForm
                        onExecute={handleExecuteCommand}
                        presets={COMMAND_PRESETS}
                        disabled={loading}
                        ref={commandFormRef}
                    />
                </RightPanel>
            </MainContent>
        </AppContainer>
    );
}

export default App;
