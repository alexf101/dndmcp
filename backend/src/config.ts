/**
 * Shared configuration for data file paths
 * All paths are relative to the project root
 */

// Get the project root directory (two levels up from this file: backend/src -> backend -> root)
const projectRoot = new URL("../..", import.meta.url).pathname.replace(
    /\/$/,
    "",
);

export const DATA_DIR = `${projectRoot}/data`;
export const BATTLE_DATA_FILE = `${DATA_DIR}/battle-data.json`;
export const CAMPAIGN_DATA_FILE = `${DATA_DIR}/campaign-data.json`;
export const DICE_DATA_FILE = `${DATA_DIR}/dice-rolls.json`;
export const OPEN_5E_SCHEMA_FILE = `${projectRoot}/open_5e_v1.yaml`; // Local copy of Open5e schema
export const OPEN_5E_API_CACHE_FILE = `${DATA_DIR}/open5e-api-cache.json`; // Cache for Open5e API responses
