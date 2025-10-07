// Re-export shared types
export * from '../../shared/types';

// Frontend-specific types
export interface CommandPreset {
  name: string;
  description: string;
  command: string;
}