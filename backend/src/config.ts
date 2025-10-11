/**
 * Shared configuration for data file paths
 * All paths are relative to the project root
 */

// Get the project root directory (two levels up from this file: backend/src -> backend -> root)
const projectRoot = new URL("../..", import.meta.url).pathname.replace(/\/$/, '');

export const DATA_DIR = `${projectRoot}/data`;
export const BATTLE_DATA_FILE = `${DATA_DIR}/battle-data.json`;
export const CAMPAIGN_DATA_FILE = `${DATA_DIR}/campaign-data.json`;
export const DICE_DATA_FILE = `${DATA_DIR}/dice-rolls.json`;
