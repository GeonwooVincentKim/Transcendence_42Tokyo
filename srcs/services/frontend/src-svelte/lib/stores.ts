/**
 * Svelte Stores for State Management
 * Replaces React Context with Svelte stores
 */

import { writable, derived } from 'svelte/store';
import type { User } from '@shared/types/auth';

// Authentication store
export const authStore = writable<{
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}>({
  user: null,
  isAuthenticated: false,
  token: null
});

// Game settings store
export const gameSettingsStore = writable<{
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  soundEnabled: boolean;
  musicEnabled: boolean;
  showDebugInfo: boolean;
}>({
  difficulty: 'medium',
  soundEnabled: true,
  musicEnabled: true,
  showDebugInfo: false
});

// Current view store
export const currentViewStore = writable<string>('login');

// Game state store
export const gameStateStore = writable<{
  isPlaying: boolean;
  currentGame: 'pong' | 'ai' | 'multiplayer' | null;
  roomId: string | null;
  playerSide: 'left' | 'right' | null;
}>({
  isPlaying: false,
  currentGame: null,
  roomId: null,
  playerSide: null
});

// Derived stores
export const isLoggedIn = derived(
  authStore,
  $authStore => $authStore.isAuthenticated
);

export const currentUser = derived(
  authStore,
  $authStore => $authStore.user
);

// Store actions
export const authActions = {
  login: (user: User, token: string) => {
    authStore.set({
      user,
      isAuthenticated: true,
      token
    });
  },
  
  logout: () => {
    authStore.set({
      user: null,
      isAuthenticated: false,
      token: null
    });
  },
  
  updateUser: (user: User) => {
    authStore.update(state => ({
      ...state,
      user
    }));
  }
};

export const gameActions = {
  startGame: (gameType: 'pong' | 'ai' | 'multiplayer', roomId?: string, playerSide?: 'left' | 'right') => {
    gameStateStore.set({
      isPlaying: true,
      currentGame: gameType,
      roomId: roomId || null,
      playerSide: playerSide || null
    });
  },
  
  endGame: () => {
    gameStateStore.set({
      isPlaying: false,
      currentGame: null,
      roomId: null,
      playerSide: null
    });
  }
};
