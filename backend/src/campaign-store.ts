import {
    Campaign,
    CampaignState,
    CampaignCreature,
    CampaignMap,
    BattleState,
    Creature,
    BattleMap,
} from "./types.ts";
import { logger } from "./logger.ts";
import { CAMPAIGN_DATA_FILE } from "./config.ts";

const DEFAULT_CAMPAIGN_NAME = "Default Campaign";

export class CampaignStore {
    private state: CampaignState;
    private saveTimeout: number | null = null;

    constructor() {
        this.state = this.loadFromFile();
        this.ensureDefaultCampaign();
    }

    // === Persistence Methods ===

    private loadFromFile(): CampaignState {
        if (Deno.env.get("DISABLE_SAVES") === "true") {
            // Don't save to file during tests
            return this.createInitialState();
        }
        try {
            const data = Deno.readTextFileSync(CAMPAIGN_DATA_FILE);
            const parsed = JSON.parse(data) as CampaignState;

            // Validate the loaded data
            if (!parsed.campaigns || !Array.isArray(parsed.campaigns)) {
                throw new Error("Invalid campaign data format");
            }

            return parsed;
        } catch (error) {
            logger.info(
                `Creating new campaign data file (${
                    error instanceof Error ? error.message : "file not found"
                })`,
            );
            return this.createInitialState();
        }
    }

    private createInitialState(): CampaignState {
        const defaultCampaign: Campaign = {
            id: crypto.randomUUID(),
            name: DEFAULT_CAMPAIGN_NAME,
            description:
                "Automatically managed default campaign for all created content",
            isDefault: true,
            creatures: [],
            maps: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        return {
            campaigns: [defaultCampaign],
            defaultCampaignId: defaultCampaign.id,
        };
    }

    private ensureDefaultCampaign(): void {
        if (!this.state.defaultCampaignId || !this.getDefaultCampaign()) {
            // Create default campaign if it doesn't exist
            const defaultCampaign = this.state.campaigns.find(
                (c) => c.isDefault,
            );
            if (!defaultCampaign) {
                const newDefault: Campaign = {
                    id: crypto.randomUUID(),
                    name: DEFAULT_CAMPAIGN_NAME,
                    description:
                        "Automatically managed default campaign for all created content",
                    isDefault: true,
                    creatures: [],
                    maps: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                this.state.campaigns.push(newDefault);
                this.state.defaultCampaignId = newDefault.id;
                this.saveToFile();
            } else {
                this.state.defaultCampaignId = defaultCampaign.id;
            }
        }
    }

    private saveToFile(): void {
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
                const data = JSON.stringify(this.state, null, 2);
                Deno.writeTextFileSync(CAMPAIGN_DATA_FILE, data);
                logger.info(`💾 Campaign data saved to ${CAMPAIGN_DATA_FILE}`);
            } catch (error) {
                logger.error("Failed to save campaign data:", error);
            }
            this.saveTimeout = null;
        }, 1000); // Save after 1 second of inactivity
    }

    // === Campaign Management ===

    getAllCampaigns(): Campaign[] {
        return this.state.campaigns;
    }

    getCampaign(id: string): Campaign | null {
        return this.state.campaigns.find((c) => c.id === id) || null;
    }

    getDefaultCampaign(): Campaign | null {
        return this.getCampaign(this.state.defaultCampaignId);
    }

    createCampaign(name: string, description?: string): Campaign {
        const campaign: Campaign = {
            id: crypto.randomUUID(),
            name,
            description,
            isDefault: false,
            creatures: [],
            maps: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        this.state.campaigns.push(campaign);
        this.saveToFile();
        return campaign;
    }

    updateCampaign(
        id: string,
        updates: { name?: string; description?: string },
    ): Campaign | null {
        const campaign = this.getCampaign(id);
        if (!campaign) return null;

        // Don't allow changing the default campaign's name
        if (campaign.isDefault && updates.name) {
            updates.name = DEFAULT_CAMPAIGN_NAME;
        }

        Object.assign(campaign, updates);
        campaign.updatedAt = Date.now();
        this.saveToFile();
        return campaign;
    }

    deleteCampaign(id: string): boolean {
        const index = this.state.campaigns.findIndex((c) => c.id === id);
        if (index === -1) return false;

        const campaign = this.state.campaigns[index];

        // Cannot delete the default campaign
        if (campaign.isDefault) {
            throw new Error("Cannot delete the default campaign");
        }

        // Move all creatures and maps to default campaign
        const defaultCampaign = this.getDefaultCampaign();
        if (defaultCampaign) {
            defaultCampaign.creatures.push(...campaign.creatures);
            defaultCampaign.maps.push(...campaign.maps);
            defaultCampaign.updatedAt = Date.now();
        }

        this.state.campaigns.splice(index, 1);
        this.saveToFile();
        return true;
    }

    // === Creature Management ===

    addCreatureToDefaultCampaign(
        creature: Creature,
        battleState?: BattleState,
    ): CampaignCreature {
        const defaultCampaign = this.getDefaultCampaign();
        if (!defaultCampaign) {
            throw new Error("Default campaign not found");
        }

        // Create campaign creature template
        const campaignCreature: CampaignCreature = {
            id: crypto.randomUUID(),
            name: creature.name,
            description: battleState
                ? `From battle: ${battleState.name}`
                : undefined,
            template: {
                name: creature.name,
                hp: creature.maxHp, // Reset to full health for template
                maxHp: creature.maxHp,
                ac: creature.ac,
                initiative: creature.initiative,
                stats: { ...creature.stats },
                statusEffects: [], // Clear status effects for template
                size: creature.size,
                isPlayer: creature.isPlayer,
            },
            createdAt: Date.now(),
            usageCount: 1,
        };

        defaultCampaign.creatures.push(campaignCreature);
        defaultCampaign.updatedAt = Date.now();
        this.saveToFile();
        return campaignCreature;
    }

    addMapToDefaultCampaign(
        map: BattleMap,
        battleState: BattleState,
    ): CampaignMap {
        const defaultCampaign = this.getDefaultCampaign();
        if (!defaultCampaign) {
            throw new Error("Default campaign not found");
        }

        const campaignMap: CampaignMap = {
            id: crypto.randomUUID(),
            name: map.description || `Map from ${battleState.name}`,
            description: `${map.width}x${map.height} map from battle: ${battleState.name}`,
            template: {
                width: map.width,
                height: map.height,
                cells: map.cells.map((row) => row.map((cell) => ({ ...cell }))), // Deep copy
                description: map.description,
            },
            createdAt: Date.now(),
            usageCount: 1,
        };

        defaultCampaign.maps.push(campaignMap);
        defaultCampaign.updatedAt = Date.now();
        this.saveToFile();
        return campaignMap;
    }

    createCreatureFromCampaign(
        campaignCreatureId: string,
        position?: { x: number; y: number },
    ): Creature | null {
        // Find the creature across all campaigns
        for (const campaign of this.state.campaigns) {
            const campaignCreature = campaign.creatures.find(
                (c) => c.id === campaignCreatureId,
            );
            if (campaignCreature) {
                // Update usage stats
                campaignCreature.usageCount++;
                campaignCreature.lastUsed = Date.now();
                campaign.updatedAt = Date.now();
                this.saveToFile();

                // Create instance from template
                const creature: Creature = {
                    ...campaignCreature.template,
                    id: crypto.randomUUID(),
                    position,
                };

                return creature;
            }
        }

        return null;
    }

    moveCreatureToCampaign(
        creatureId: string,
        sourceCampaignId: string,
        targetCampaignId: string,
    ): boolean {
        const sourceCampaign = this.getCampaign(sourceCampaignId);
        const targetCampaign = this.getCampaign(targetCampaignId);

        if (!sourceCampaign || !targetCampaign) return false;

        const creatureIndex = sourceCampaign.creatures.findIndex(
            (c) => c.id === creatureId,
        );
        if (creatureIndex === -1) return false;

        const creature = sourceCampaign.creatures.splice(creatureIndex, 1)[0];
        targetCampaign.creatures.push(creature);

        sourceCampaign.updatedAt = Date.now();
        targetCampaign.updatedAt = Date.now();
        this.saveToFile();
        return true;
    }

    moveMapToCampaign(
        mapId: string,
        sourceCampaignId: string,
        targetCampaignId: string,
    ): boolean {
        const sourceCampaign = this.getCampaign(sourceCampaignId);
        const targetCampaign = this.getCampaign(targetCampaignId);

        if (!sourceCampaign || !targetCampaign) return false;

        const mapIndex = sourceCampaign.maps.findIndex((m) => m.id === mapId);
        if (mapIndex === -1) return false;

        const map = sourceCampaign.maps.splice(mapIndex, 1)[0];
        targetCampaign.maps.push(map);

        sourceCampaign.updatedAt = Date.now();
        targetCampaign.updatedAt = Date.now();
        this.saveToFile();
        return true;
    }

    getCampaignCreature(creatureId: string): CampaignCreature | null {
        // Find the creature across all campaigns
        for (const campaign of this.state.campaigns) {
            const campaignCreature = campaign.creatures.find(
                (c) => c.id === creatureId,
            );
            if (campaignCreature) {
                return campaignCreature;
            }
        }
        return null;
    }

    // === Search and Query Methods ===

    searchCreatures(query: string, campaignId?: string): CampaignCreature[] {
        const campaigns = campaignId
            ? [this.getCampaign(campaignId)].filter(Boolean)
            : this.state.campaigns;
        const results: CampaignCreature[] = [];

        for (const campaign of campaigns) {
            const matches = campaign!.creatures.filter(
                (creature) =>
                    creature.name.toLowerCase().includes(query.toLowerCase()) ||
                    creature.description
                        ?.toLowerCase()
                        .includes(query.toLowerCase()),
            );
            results.push(...matches);
        }

        // Sort by usage count (most used first) then by name
        return results.sort((a, b) => {
            if (a.usageCount !== b.usageCount) {
                return b.usageCount - a.usageCount;
            }
            return a.name.localeCompare(b.name);
        });
    }

    searchMaps(query: string, campaignId?: string): CampaignMap[] {
        const campaigns = campaignId
            ? [this.getCampaign(campaignId)].filter(Boolean)
            : this.state.campaigns;
        const results: CampaignMap[] = [];

        for (const campaign of campaigns) {
            const matches = campaign!.maps.filter(
                (map) =>
                    map.name.toLowerCase().includes(query.toLowerCase()) ||
                    map.description
                        ?.toLowerCase()
                        .includes(query.toLowerCase()),
            );
            results.push(...matches);
        }

        return results.sort((a, b) => {
            if (a.usageCount !== b.usageCount) {
                return b.usageCount - a.usageCount;
            }
            return a.name.localeCompare(b.name);
        });
    }

    // === Cleanup methods ===
    dispose(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }

    // === Test utility method ===
    clearAllCampaigns(): void {
        // Clear any pending save timers first
        this.dispose();

        try {
            Deno.removeSync(CAMPAIGN_DATA_FILE);
        } catch {
            // File might not exist, ignore error
        }
        this.state = this.createInitialState();
        this.saveToFile();
    }
}
