import { BattleStore } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";
import { DiceStore } from "./dice-store.ts";
import { generateRoutes } from "./route-generator.ts";
import { sseManager } from "./sse-manager.ts";

const campaignStore = new CampaignStore();
const battleStore = new BattleStore(campaignStore);
const diceStore = new DiceStore();

// Register SSE emitter for dice rolls
diceStore.registerSSEEmitter((roll) => {
    sseManager.broadcastDiceRoll(roll);
});

const router = generateRoutes(battleStore, campaignStore, diceStore);

// Export the stores for testing purposes
export { battleStore, campaignStore, diceStore };
export default router;