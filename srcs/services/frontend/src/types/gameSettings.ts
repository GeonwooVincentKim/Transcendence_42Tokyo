/**
 * Game Settings Types
 * Defines the structure for game customization options
 */

export interface GameSettings {
  // Difficulty settings
  difficulty: 'easy' | 'medium' | 'hard';
  
  // Sound settings
  soundEnabled: boolean;
  soundVolume: number; // 0-100
  
  // Control settings
  leftPaddleUp: string;
  leftPaddleDown: string;
  rightPaddleUp: string;
  rightPaddleDown: string;
  
  // Game speed settings
  paddleSpeed: number; // 1-15
  ballSpeed: number; // 1-10
  
  // Visual settings
  showFPS: boolean;
  showScore: boolean;
  
  // Game rules
  maxScore: number; // 5-21
  ballSize: number; // 3-8
  paddleHeight: number; // 80-120
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  difficulty: 'medium',
  soundEnabled: true,
  soundVolume: 50,
  leftPaddleUp: 'w',
  leftPaddleDown: 's',
  rightPaddleUp: 'arrowup',
  rightPaddleDown: 'arrowdown',
  paddleSpeed: 8,
  ballSpeed: 5,
  showFPS: false,
  showScore: true,
  maxScore: 11,
  ballSize: 5,
  paddleHeight: 100
};

export interface GameSettingsContextType {
  settings: GameSettings;
  updateSettings: (newSettings: Partial<GameSettings>) => void;
  resetToDefaults: () => void;
} 