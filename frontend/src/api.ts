import type { APIResponse, BattleState, Creature, BattleCommand } from "./types";
import { getCommandUrl, getCommandMethod, buildCommandBody } from "./types";

const API_BASE = "http://localhost:8083";

export async function createBattle(name: string): Promise<BattleState> {
    const response = await fetch(`${API_BASE}/api/battles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    const result: APIResponse<BattleState> = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data!;
}

export async function getBattle(id: string): Promise<BattleState> {
    const response = await fetch(`${API_BASE}/api/battles/${id}`);
    const result: APIResponse<BattleState> = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data!;
}

export async function getAllBattles(): Promise<BattleState[]> {
    const response = await fetch(`${API_BASE}/api/battles`);
    const result: APIResponse<BattleState[]> = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data!;
}

export async function addCreature(
    battleId: string,
    creature: Creature,
): Promise<BattleState> {
    const response = await fetch(`${API_BASE}/battles/${battleId}/creatures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creature),
    });
    const result: APIResponse<BattleState> = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data!;
}

export async function updateCreature(
    battleId: string,
    creatureId: string,
    updates: Partial<Creature>,
): Promise<BattleState> {
    const response = await fetch(
        `${API_BASE}/battles/${battleId}/creatures/${creatureId}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        },
    );
    const result: APIResponse<BattleState> = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data!;
}


export async function executeCommand(
    battleId: string,
    command: BattleCommand,
): Promise<BattleState> {
    const url = getCommandUrl(API_BASE, battleId, command.type, command.data);
    const method = getCommandMethod(command.type);
    const body = buildCommandBody(command.type, command.data);

    const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body && { body }),
    });

    const result: APIResponse<BattleState> = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data!;
}
