// Shared types between frontend and backend

export interface Creature {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  statusEffects: StatusEffect[];
  position?: { x: number; y: number };
  isPlayer: boolean;
}

export interface StatusEffect {
  name: string;
  description?: string;
  duration?: number;
  concentration?: boolean;
}

export interface BattleState {
  id: string;
  name: string;
  creatures: Creature[];
  currentTurn: number;
  round: number;
  isActive: boolean;
  history: BattleAction[];
}

export interface BattleAction {
  id: string;
  timestamp: number;
  type: string;
  data: unknown;
  previousState?: Partial<BattleState>;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

// Strongly typed command definitions
export type BattleCommand =
  | { type: 'ADD_CREATURE'; data: Omit<Creature, 'id'> }
  | { type: 'UPDATE_CREATURE'; data: { creatureId: string; updates: Partial<Creature> } }
  | { type: 'REMOVE_CREATURE'; data: { creatureId: string } }
  | { type: 'NEXT_TURN'; data: {} }
  | { type: 'START_BATTLE'; data: {} }
  | { type: 'UNDO'; data: {} }
  | { type: 'CREATE_BATTLE'; data: { name: string } };

export const COMMAND_TYPES = [
  'ADD_CREATURE',
  'UPDATE_CREATURE',
  'REMOVE_CREATURE',
  'NEXT_TURN',
  'START_BATTLE',
  'UNDO',
  'CREATE_BATTLE'
] as const;

export type CommandType = typeof COMMAND_TYPES[number];

// Route configuration that both backend and frontend use
export interface RouteConfig {
  path: string;
  method: string;
  pathParams?: string[];
  bodyExtractor?: string; // How to extract data from request body
  validation?: string[]; // Required fields to validate
}

export const ROUTE_CONFIGS: Record<CommandType, RouteConfig> = {
  ADD_CREATURE: {
    path: "/api/battles/:id/creatures",
    method: "POST",
    pathParams: ["id"],
    bodyExtractor: "body",
    validation: ["name", "hp", "maxHp"]
  },
  UPDATE_CREATURE: {
    path: "/api/battles/:id/creatures/:creatureId",
    method: "PUT",
    pathParams: ["id", "creatureId"],
    bodyExtractor: "body"
  },
  REMOVE_CREATURE: {
    path: "/api/battles/:id/creatures/:creatureId",
    method: "DELETE",
    pathParams: ["id", "creatureId"]
  },
  NEXT_TURN: {
    path: "/api/battles/:id/next-turn",
    method: "POST",
    pathParams: ["id"]
  },
  START_BATTLE: {
    path: "/api/battles/:id/start",
    method: "POST",
    pathParams: ["id"]
  },
  UNDO: {
    path: "/api/battles/:id/undo",
    method: "POST",
    pathParams: ["id"]
  },
  CREATE_BATTLE: {
    path: "/api/battles",
    method: "POST",
    bodyExtractor: "body",
    validation: ["name"]
  }
} as const;

// Helper functions for frontend to use ROUTE_CONFIGS
export function getCommandUrl(baseUrl: string, battleId: string, commandType: CommandType, data?: any): string {
  const config = ROUTE_CONFIGS[commandType];
  let path = config.path;

  // Replace path parameters
  if (config.pathParams?.includes('id')) {
    path = path.replace(':id', battleId);
  }
  if (config.pathParams?.includes('creatureId') && data?.creatureId) {
    path = path.replace(':creatureId', data.creatureId);
  }

  return `${baseUrl}${path}`;
}

export function getCommandMethod(commandType: CommandType): string {
  return ROUTE_CONFIGS[commandType].method;
}

export function buildCommandBody(commandType: CommandType, data: any): string | undefined {
  const config = ROUTE_CONFIGS[commandType];
  if (!config.bodyExtractor) return undefined;

  // Handle different command types
  switch (commandType) {
    case 'UPDATE_CREATURE':
      return JSON.stringify(data.updates);
    case 'CREATE_BATTLE':
      return JSON.stringify({ name: data.name });
    default:
      return JSON.stringify(data);
  }
}