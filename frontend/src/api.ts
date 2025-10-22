import type {
    APIResponse,
    BattleState,
    Creature,
    BattleCommand,
    Campaign,
    CampaignCreature,
    BattleSummary,
} from "./types";
import { getCommandUrl, getCommandMethod, buildCommandBody } from "./types";

const API_BASE = "http://localhost:8000";

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

export async function getAllBattles(): Promise<BattleSummary[]> {
    const response = await fetch(`${API_BASE}/api/battles`);
    const result: APIResponse<BattleSummary[]> = await response.json();
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

// Campaign API functions
export async function getAllCampaigns(): Promise<Campaign[]> {
    const response = await fetch(`${API_BASE}/api/campaigns`);
    const result: APIResponse<Campaign[]> = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data!;
}

export async function searchCampaignCreatures(
    query: string,
    campaignId?: string,
): Promise<CampaignCreature[]> {
    const params = new URLSearchParams({ q: query });
    if (campaignId) params.append("campaignId", campaignId);

    const response = await fetch(
        `${API_BASE}/api/campaigns/creatures/search?${params}`,
    );
    const result: APIResponse<CampaignCreature[]> = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data!;
}

export async function addCreatureFromCampaign(
    battleId: string,
    campaignCreatureId: string,
    position?: { x: number; y: number },
): Promise<BattleState> {
    const response = await fetch(
        `${API_BASE}/api/battles/${battleId}/creatures/from-campaign/${campaignCreatureId}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position }),
        },
    );
    const result: APIResponse<BattleState> = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data!;
}
