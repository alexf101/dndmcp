import { BattleStore } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";
import { generateRoutes } from "./route-generator.ts";

const campaignStore = new CampaignStore();
const battleStore = new BattleStore(campaignStore);
const router = generateRoutes(battleStore, campaignStore);

// Export the stores for testing purposes
export { battleStore, campaignStore };
export default router;