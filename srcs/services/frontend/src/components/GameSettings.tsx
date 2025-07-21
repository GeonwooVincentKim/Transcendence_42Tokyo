import React, { useState } from 'react';
import { useGameSettings } from '../contexts/GameSettingsContext';

interface GameSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Game Settings Component
 * 
 * Provides a comprehensive settings interface for customizing the Pong game
 */
export const GameSettings: React.FC<GameSettingsProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetToDefaults } = useGameSettings();
  const [localSettings, setLocalSettings] = useState(settings);

  // Update local settings when global settings change
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    onClose();
  };

  const handleReset = () => {
    resetToDefaults();
    setLocalSettings(settings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Game Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Difficulty Settings */}
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="text-lg font-semibold text-white mb-3">Difficulty</h3>
            <div className="flex gap-4">
              {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                <label key={difficulty} className="flex items-center">
                  <input
                    type="radio"
                    name="difficulty"
                    value={difficulty}
                    checked={localSettings.difficulty === difficulty}
                    onChange={(e) => setLocalSettings(prev => ({
                      ...prev,
                      difficulty: e.target.value as 'easy' | 'medium' | 'hard'
                    }))}
                    className="mr-2"
                  />
                  <span className="text-white capitalize">{difficulty}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sound Settings */}
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="text-lg font-semibold text-white mb-3">Sound</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings.soundEnabled}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    soundEnabled: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-white">Enable Sound</span>
              </label>
              <div>
                <label className="text-white block mb-2">Volume: {localSettings.soundVolume}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localSettings.soundVolume}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    soundVolume: parseInt(e.target.value)
                  }))}
                  className="w-full"
                  disabled={!localSettings.soundEnabled}
                />
              </div>
            </div>
          </div>

          {/* Control Settings */}
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="text-lg font-semibold text-white mb-3">Controls</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white block mb-2">Left Paddle Up</label>
                <input
                  type="text"
                  value={localSettings.leftPaddleUp}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    leftPaddleUp: e.target.value
                  }))}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="text-white block mb-2">Left Paddle Down</label>
                <input
                  type="text"
                  value={localSettings.leftPaddleDown}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    leftPaddleDown: e.target.value
                  }))}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="text-white block mb-2">Right Paddle Up</label>
                <input
                  type="text"
                  value={localSettings.rightPaddleUp}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    rightPaddleUp: e.target.value
                  }))}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="text-white block mb-2">Right Paddle Down</label>
                <input
                  type="text"
                  value={localSettings.rightPaddleDown}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    rightPaddleDown: e.target.value
                  }))}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Speed Settings */}
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="text-lg font-semibold text-white mb-3">Speed</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white block mb-2">Paddle Speed: {localSettings.paddleSpeed}</label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={localSettings.paddleSpeed}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    paddleSpeed: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-white block mb-2">Ball Speed: {localSettings.ballSpeed}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={localSettings.ballSpeed}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    ballSpeed: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Visual Settings */}
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="text-lg font-semibold text-white mb-3">Visual</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings.showFPS}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    showFPS: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-white">Show FPS</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings.showScore}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    showScore: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-white">Show Score</span>
              </label>
            </div>
          </div>

          {/* Game Rules */}
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="text-lg font-semibold text-white mb-3">Game Rules</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-white block mb-2">Max Score: {localSettings.maxScore}</label>
                <input
                  type="range"
                  min="5"
                  max="21"
                  value={localSettings.maxScore}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    maxScore: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-white block mb-2">Ball Size: {localSettings.ballSize}</label>
                <input
                  type="range"
                  min="3"
                  max="8"
                  value={localSettings.ballSize}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    ballSize: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-white block mb-2">Paddle Height: {localSettings.paddleHeight}</label>
                <input
                  type="range"
                  min="80"
                  max="120"
                  value={localSettings.paddleHeight}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    paddleHeight: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-600">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reset to Defaults
          </button>
          <div className="space-x-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 