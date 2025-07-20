import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameSettings, DEFAULT_GAME_SETTINGS, GameSettingsContextType } from '../types/gameSettings';

const GameSettingsContext = createContext<GameSettingsContextType | undefined>(undefined);

interface GameSettingsProviderProps {
  children: ReactNode;
}

/**
 * Game Settings Provider Component
 * 
 * Provides global access to game settings with localStorage persistence
 */
export const GameSettingsProvider: React.FC<GameSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('pongGameSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_GAME_SETTINGS, ...parsedSettings });
      } catch (error) {
        console.error('Failed to parse saved game settings:', error);
        setSettings(DEFAULT_GAME_SETTINGS);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pongGameSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_GAME_SETTINGS);
  };

  const value: GameSettingsContextType = {
    settings,
    updateSettings,
    resetToDefaults
  };

  return (
    <GameSettingsContext.Provider value={value}>
      {children}
    </GameSettingsContext.Provider>
  );
};

/**
 * Custom hook to use game settings
 * @returns GameSettingsContextType
 */
export const useGameSettings = (): GameSettingsContextType => {
  const context = useContext(GameSettingsContext);
  if (context === undefined) {
    throw new Error('useGameSettings must be used within a GameSettingsProvider');
  }
  return context;
}; 