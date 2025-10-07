import { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import type { BattleState, CommandPreset } from "./types";
import { createBattle, getBattle, getAllBattles, executeCommand } from "./api";
import BattleDisplay from "./components/BattleDisplay";
import CommandForm from "./components/CommandForm";
import CreatureTable from "./components/CreatureTable";

const AppContainer = styled.div`
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, -apple-system, sans-serif;
`;

const Header = styled.header`
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #333;

    h1 {
        margin: 0;
        color: #d4af37;
    }

    select,
    button {
        padding: 0.5rem;
        border: 1px solid #666;
        background: #222;
        color: white;
        border-radius: 4px;
    }
`;

const ErrorMessage = styled.div`
    background: #fee;
    color: #c00;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    border: 1px solid #fcc;
`;

const LoadingMessage = styled.div`
    background: #eff;
    color: #06c;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    border: 1px solid #ccf;
`;

const MainContent = styled.div`
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 2rem;
    align-items: start;

    @media (max-width: 1000px) {
        grid-template-columns: 1fr;
    }
`;

const LeftPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2rem;
`;

const RightPanel = styled.div`
    position: sticky;
    top: 1rem;

    @media (max-width: 1000px) {
        position: static;
    }
`;

const COMMAND_PRESETS: CommandPreset[] = [
    {
        name: "Create Battle",
        description: "Create a new battle encounter",
        command: `{
  "type": "CREATE_BATTLE",
  "data": {
    "name": "Goblin Ambush"
  }
}`,
    },
    {
        name: "Add Creature",
        description: "Add a creature to the battle",
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
            </Header>

            {error && <ErrorMessage>❌ Error: {error}</ErrorMessage>}

            {loading && <LoadingMessage>⏳ Loading...</LoadingMessage>}

            <MainContent>
                <LeftPanel>
                    <BattleDisplay battle={currentBattle} />
                    {currentBattle && (
                        <CreatureTable
                            creatures={currentBattle.creatures}
                            currentTurn={currentBattle.currentTurn}
                        />
                    )}
                </LeftPanel>

                <RightPanel>
                    <CommandForm
                        onExecute={handleExecuteCommand}
                        presets={COMMAND_PRESETS}
                        disabled={loading}
                    />
                </RightPanel>
            </MainContent>
        </AppContainer>
    );
}

export default App;
