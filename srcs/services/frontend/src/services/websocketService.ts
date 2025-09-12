/**
 * HTTP Polling Service for Real-time Game Synchronization
 * (WebSocket alternative)
 */

interface GameRoomState {
  roomId: string;
  players: any[];
  player1Ready: boolean;
  player2Ready: boolean;
  gameStarted: boolean;
  gameState?: any;
  gameControl?: {
    isPaused: boolean;
    isStarted: boolean;
    isReset: boolean;
    lastControlUpdate?: number;
  };
  lastUpdate?: number;
}

class WebSocketService {
  private roomId: string | null = null;
  private userId: string | null = null;
  private tournamentId: number | null = null;
  private matchId: number | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isPolling = false;

  constructor() {
    this.setupMessageHandlers();
  }

  /**
   * Connect to game room using HTTP polling
   */
  connect(tournamentId: number, matchId: number, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;
        this.tournamentId = tournamentId;
        this.matchId = matchId;
        this.roomId = `tournament-${tournamentId}-match-${matchId}`;
        
        console.log('Connecting to game room via HTTP polling:', this.roomId);
        
        // Start polling for game state
        this.startPolling();
        
        // Simulate connection success
        setTimeout(() => {
          console.log('HTTP polling connection established');
          this.reconnectAttempts = 0;
          this.joinRoom();
          resolve();
        }, 100);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from game room
   */
  disconnect() {
    this.stopPolling();
    this.leaveRoom();
    this.roomId = null;
    this.userId = null;
    this.tournamentId = null;
    this.matchId = null;
  }

  /**
   * Start HTTP polling for game state
   */
  private startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.pollingInterval = setInterval(() => {
      this.pollGameState();
      this.pollTournamentState();
    }, 200); // Poll every 200ms for faster synchronization
  }

  /**
   * Stop HTTP polling
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * Poll game state from server
   */
  private async pollGameState() {
    if (!this.tournamentId || !this.matchId || !this.userId) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/game/${this.tournamentId}/${this.matchId}/state?userId=${this.userId}`
      );
      
      if (response.ok) {
        const gameState: GameRoomState = await response.json();
        this.handleGameStateUpdate(gameState);
      }
    } catch (error) {
      console.error('Error polling game state:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Poll tournament state from server
   */
  private async pollTournamentState() {
    if (!this.tournamentId || !this.userId) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/tournaments/${this.tournamentId}/state?userId=${this.userId}`
      );
      
      if (response.ok) {
        const tournamentState = await response.json();
        this.handleTournamentStateUpdate(tournamentState);
      }
    } catch (error) {
      console.error('Error polling tournament state:', error);
    }
  }

  /**
   * Handle game state updates from polling
   */
  private handleGameStateUpdate(gameState: GameRoomState) {
    console.log('Handling game state update:', gameState);
    
    // Check if game started
    if (gameState.gameStarted && gameState.gameState) {
      console.log('Game started - emitting events');
      this.emit('game_start', { roomState: gameState });
      this.emit('game_playing', { roomState: gameState });
    }
    
    // Check player ready status
    if (gameState.player1Ready && gameState.player2Ready && !gameState.gameStarted) {
      console.log('Both players ready - emitting ready event');
      this.emit('player_ready', { roomState: gameState });
    }
    
    // Handle game control updates
    if (gameState.gameControl) {
      console.log('Game control update:', gameState.gameControl);
      this.emit('game_control_update', { gameControl: gameState.gameControl });
    }
    
    // Always emit general state update for synchronization
    console.log('Emitting general game state update');
    this.emit('game_state_update', { roomState: gameState });
  }

  /**
   * Handle tournament state updates from polling
   */
  private handleTournamentStateUpdate(tournamentState: any) {
    console.log('Handling tournament state update:', tournamentState);
    // Emit tournament state update for Start Tournament synchronization
    this.emit('tournament_state_update', { tournamentState });
  }

  /**
   * Join game room (HTTP polling automatically handles this)
   */
  private joinRoom() {
    console.log('Joined game room via HTTP polling');
    this.emit('connected', { roomId: this.roomId });
  }

  /**
   * Leave game room
   */
  private leaveRoom() {
    console.log('Left game room');
  }

  /**
   * Set player ready status via HTTP
   */
  async setPlayerReady(ready: boolean) {
    console.log('setPlayerReady called with:', { ready, tournamentId: this.tournamentId, matchId: this.matchId, userId: this.userId });
    
    if (!this.tournamentId || !this.matchId || !this.userId) {
      console.error('Cannot set ready status: missing connection info', {
        tournamentId: this.tournamentId,
        matchId: this.matchId,
        userId: this.userId
      });
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/game/${this.tournamentId}/${this.matchId}/ready`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: this.userId,
            ready: ready
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('Player ready status updated:', result);
        this.handleGameStateUpdate(result);
      } else {
        console.error('Failed to update ready status:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating ready status:', error);
    }
  }

  /**
   * Send game control action (Start/Pause/Reset)
   */
  async sendGameControl(action: 'start' | 'pause' | 'reset') {
    if (!this.tournamentId || !this.matchId || !this.userId) {
      console.error('Cannot send game control: not connected');
      return;
    }

    console.log(`Game control action '${action}' requested by user ${this.userId}`);
    
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No JWT token found');
        return;
      }

      // Call the backend API
      const response = await fetch(`http://localhost:8000/api/game/${this.tournamentId}/${this.matchId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Game control API response:', result);
      
      // Emit game control event for immediate UI update
      this.emit('game_control', { 
        action, 
        userId: this.userId,
        timestamp: Date.now(),
        gameControl: result.gameControl
      });
      
    } catch (error) {
      console.error('Failed to send game control:', error);
      
      // Fallback: emit local event anyway
      this.emit('game_control', { 
        action, 
        userId: this.userId,
        timestamp: Date.now(),
        gameControl: {
          isPaused: action === 'pause',
          isStarted: action === 'start',
          isReset: action === 'reset',
          lastControlUpdate: Date.now()
        }
      });
    }
  }

  /**
   * Update game state (placeholder for HTTP polling)
   */
  updateGameState(gameState: any) {
    console.log('Game state update (HTTP polling):', gameState);
    // In HTTP polling mode, game state is managed by the server
    // This is mainly for compatibility
  }

  /**
   * End game (placeholder for HTTP polling)
   */
  endGame(gameResult: any) {
    console.log('Game ended (HTTP polling):', gameResult);
    this.emit('game_end', { gameResult });
  }

  /**
   * Setup message handlers (HTTP polling mode)
   */
  private setupMessageHandlers() {
    // HTTP polling mode doesn't need message handlers
    // Events are emitted directly from polling responses
  }

  /**
   * Attempt to reconnect (HTTP polling mode)
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.roomId && this.userId && this.tournamentId && this.matchId) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect HTTP polling (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(this.tournamentId!, this.matchId!, this.userId!)
          .catch(error => {
            console.error('HTTP polling reconnection failed:', error);
          });
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  /**
   * Event emitter functionality
   */
  private eventListeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.isPolling && this.roomId !== null && this.userId !== null;
  }

  /**
   * Get room state
   */
  getRoomId(): string | null {
    return this.roomId;
  }

  /**
   * Manually refresh game and tournament state
   */
  refreshState(): void {
    if (this.tournamentId && this.matchId && this.userId) {
      console.log('Manual refresh triggered');
      this.pollGameState();
      this.pollTournamentState();
    }
  }
}

export default new WebSocketService();
