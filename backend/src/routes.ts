import { BattleStore } from "./battle-store.ts";
import { generateRoutes } from "./route-generator.ts";

const battleStore = new BattleStore();
const router = generateRoutes(battleStore);

export default router;