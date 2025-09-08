/**
 * WebSocket Service for Real-time Game Synchronization
 */

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// interface GameRoomState {
//   status: 'waiting' | 'ready' | 'playing' | 'finished';
//   player1Id?: number;
//   player2Id?: number;
//   player1Ready: boolean;
//   player2Ready: boolean;
//   gameData?: any;
// }

class WebSocketService {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupMessageHandlers();
  }

  /**
   * Connect to WebSocket server
   */
  connect(tournamentId: number, matchId: number, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;
        this.roomId = `tournament-${tournamentId}-match-${matchId}`;
        
        const wsUrl = `ws://localhost:8000/ws/game/${tournamentId}/${matchId}?userId=${userId}`;
        console.log('Connecting to WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.joinRoom();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.ws = null;
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.leaveRoom();
      this.ws.close();
      this.ws = null;
    }
    this.roomId = null;
    this.userId = null;
  }

  /**
   * Join game room
   */
  private joinRoom() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'join_room'
      });
    }
  }

  /**
   * Leave game room
   */
  private leaveRoom() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'leave_room'
      });
    }
  }

  /**
   * Set player ready status
   */
  setPlayerReady(ready: boolean) {
    this.send({
      type: 'player_ready',
      ready
    });
  }

  /**
   * Update game state
   */
  updateGameState(gameState: any) {
    this.send({
      type: 'game_state_update',
      gameState
    });
  }

  /**
   * End game
   */
  endGame(gameResult: any) {
    this.send({
      type: 'game_end',
      gameResult
    });
  }

  /**
   * Send message to server
   */
  private send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    } else {
      console.log('No handler for message type:', message.type);
    }
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers() {
    this.messageHandlers.set('connected', (data) => {
      console.log('Connected to game room:', data);
    });

    this.messageHandlers.set('player_joined', (data) => {
      console.log('Player joined:', data);
      this.emit('player_joined', data);
    });

    this.messageHandlers.set('player_left', (data) => {
      console.log('Player left:', data);
      this.emit('player_left', data);
    });

    this.messageHandlers.set('player_ready', (data) => {
      console.log('Player ready status:', data);
      this.emit('player_ready', data);
    });

    this.messageHandlers.set('game_start', (data) => {
      console.log('Game starting:', data);
      this.emit('game_start', data);
    });

    this.messageHandlers.set('game_playing', (data) => {
      console.log('Game is playing:', data);
      this.emit('game_playing', data);
    });

    this.messageHandlers.set('game_state_update', (data) => {
      console.log('Game state update:', data);
      this.emit('game_state_update', data);
    });

    this.messageHandlers.set('game_end', (data) => {
      console.log('Game ended:', data);
      this.emit('game_end', data);
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.roomId && this.userId) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        const [tournamentId, matchId] = this.roomId!.split('-').slice(1, 3);
        this.connect(parseInt(tournamentId), parseInt(matchId), this.userId!)
          .catch(error => {
            console.error('Reconnection failed:', error);
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
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get room state
   */
  getRoomId(): string | null {
    return this.roomId;
  }
}

export default new WebSocketService();
