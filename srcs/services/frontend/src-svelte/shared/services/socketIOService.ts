/**
 * Socket.IO Client Service for Real-time Game Synchronization
 * Provides automatic fallback and reconnection capabilities
 */

import { io, Socket } from 'socket.io-client';

// GameRoomState interface removed as it's not used in Socket.IO implementation

interface SocketIOEventHandlers {
  onConnected?: (data: any) => void;
  onPlayerJoined?: (data: any) => void;
  onPlayerLeft?: (data: any) => void;
  onPlayerReady?: (data: any) => void;
  onSpectatorMode?: (data: any) => void;
  onGameStart?: (data: any) => void;
  onGamePlaying?: (data: any) => void;
  onGamePause?: (data: any) => void;
  onGameStateUpdate?: (data: any) => void;
  onGameState?: (data: any) => void;
  onGameReset?: (data: any) => void;
  onGameEnd?: (data: any) => void;
  onPong?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: any) => void;
}

class SocketIOService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private tournamentId: number | null = null;
  private matchId: number | null = null;
  private gameSpeed: 'slow' | 'normal' | 'fast' = 'normal';
  private eventHandlers: SocketIOEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupMessageHandlers();
  }

  /**
   * Connect to Socket.IO server
   */
  connect(tournamentId: number, matchId: number, userId: string, roomId?: string, playerSide?: 'left' | 'right', gameSpeed: 'slow' | 'normal' | 'fast' = 'normal'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.tournamentId = tournamentId;
        this.matchId = matchId;
        this.userId = userId;
        this.gameSpeed = gameSpeed;

        // Socket.IO server runs on the backend port (8000)
        // Dynamically determine URL at runtime (no rebuild needed when IP changes)
        // Always derive from current hostname, ignore VITE_API_URL
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        let socketUrl: string;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          socketUrl = 'http://localhost:8000';
        } else {
          socketUrl = `${protocol}//${hostname}:8000`;
        }
        console.log('🔍 Socket.IO URL:', socketUrl);
        console.log('Connecting to Socket.IO server:', socketUrl);

        this.socket = io(socketUrl, {
          transports: ['websocket', 'polling'], // Enable fallback to polling
          timeout: 20000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          console.log('Socket.IO connected:', this.socket?.id);
          this.reconnectAttempts = 0;
          
          // Use provided roomId or generate one
          const finalRoomId = roomId || `tournament-${tournamentId}-match-${matchId}`;
          console.log('🔍 SocketIOService joining room:', finalRoomId);
          console.log('🔍 SocketIOService tournamentId:', tournamentId, 'matchId:', matchId);
          console.log('🔍 SocketIOService playerSide:', playerSide);
          
          // Get JWT token from localStorage
          const token = localStorage.getItem('token');
          console.log('🔍 SocketIOService token:', token ? 'provided' : 'not provided');
          console.log('🔍 SocketIOService userId:', userId);
          console.log('🔍 SocketIOService roomId:', finalRoomId);
          
          // Decode token to check userId (for debugging)
          if (token) {
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                console.log('🔍 SocketIOService token payload:', payload);
                console.log('🔍 SocketIOService token userId:', payload.id || payload.userId);
              }
            } catch (e) {
              console.log('🔍 SocketIOService failed to decode token:', e);
            }
          }
          
          const joinData = {
            roomId: finalRoomId,
            tournamentId,
            matchId,
            userId,
            token,
            playerSide,
            gameSpeed: this.gameSpeed
          };
          
          console.log('🎯 SENDING join_game_room with data:');
          console.log('   roomId:', joinData.roomId);
          console.log('   tournamentId:', joinData.tournamentId);
          console.log('   matchId:', joinData.matchId);
          console.log('   userId:', joinData.userId);
          console.log('   token:', joinData.token ? 'provided' : 'not provided');
          console.log('   playerSide:', joinData.playerSide, '(type:', typeof joinData.playerSide + ')');
          console.log('   Full object:', JSON.stringify(joinData, null, 2));
          
          this.socket?.emit('join_game_room', joinData);

          // Start ping interval
          this.startPingInterval();
          
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error);
          this.attemptReconnect();
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket.IO disconnected:', reason);
          this.stopPingInterval();
          this.eventHandlers.onDisconnect?.(reason);
          
          if (reason === 'io server disconnect') {
            // Server disconnected, try to reconnect
            this.attemptReconnect();
          }
        });

        this.socket.on('error', (error) => {
          console.error('Socket.IO error:', error);
          this.eventHandlers.onError?.(error);
        });

        // Set up event handlers
        this.setupEventHandlers();

      } catch (error) {
        console.error('Failed to connect to Socket.IO:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      this.socket.emit('leave_game_room', { userId: this.userId });
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopPingInterval();
    this.userId = null;
    this.tournamentId = null;
    this.matchId = null;
    this.gameSpeed = 'normal';
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: SocketIOEventHandlers) {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Send player ready status
   */
  sendPlayerReady(ready: boolean) {
    if (this.socket && this.userId) {
      this.socket.emit('player_ready', {
        userId: this.userId,
        ready
      });
    }
  }

  /**
   * Send game state update
   */
  sendGameStateUpdate(gameState: any) {
    if (this.socket && this.userId) {
      this.socket.emit('game_state_update', {
        userId: this.userId,
        gameState
      });
    }
  }

  /**
   * Send game end result
   */
  sendGameEnd(gameResult: any) {
    if (this.socket && this.userId) {
      this.socket.emit('game_end', {
        userId: this.userId,
        gameResult
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection state
   */
  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'disconnected';
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connected', (data) => {
      console.log('Socket.IO connected event:', data);
      this.eventHandlers.onConnected?.(data);
    });

    this.socket.on('player_joined', (data) => {
      console.log('Player joined:', data);
      this.eventHandlers.onPlayerJoined?.(data);
    });

    this.socket.on('player_left', (data) => {
      console.log('Player left:', data);
      this.eventHandlers.onPlayerLeft?.(data);
    });

    this.socket.on('spectator_mode', (data) => {
      console.log('Spectator mode activated:', data);
      this.eventHandlers.onSpectatorMode?.(data);
    });

    this.socket.on('player_ready', (data) => {
      console.log('Player ready:', data);
      this.eventHandlers.onPlayerReady?.(data);
    });

    this.socket.on('game_start', (data) => {
      console.log('Game start:', data);
      this.eventHandlers.onGameStart?.(data);
    });

    this.socket.on('game_playing', (data) => {
      console.log('Game playing:', data);
      this.eventHandlers.onGamePlaying?.(data);
    });

    this.socket.on('game_pause', (data) => {
      console.log('Game pause:', data);
      this.eventHandlers.onGamePause?.(data);
    });

    this.socket.on('game_state_update', (data) => {
      // Game state updates are very frequent (30 FPS), so we don't log them
      // Uncomment the line below for debugging if needed
      // console.log('Game state update:', data);
      this.eventHandlers.onGameStateUpdate?.(data);
    });

    this.socket.on('game_state', (data) => {
      console.log('Game state:', data);
      this.eventHandlers.onGameState?.(data);
    });

    this.socket.on('game_reset', (data) => {
      console.log('🔄 Game reset event received:', data);
      this.eventHandlers.onGameReset?.(data);
    });

    this.socket.on('game_end', (data) => {
      console.log('Game end:', data);
      this.eventHandlers.onGameEnd?.(data);
    });

    this.socket.on('pong', () => {
      this.eventHandlers.onPong?.();
    });

    this.socket.on('player_reconnected', (data) => {
      console.log('Player reconnected:', data);
      // If this is our own reconnection, update playerSide if provided
      if (data.userId === this.userId && data.playerSide) {
        console.log('🔍 Updating playerSide after reconnection:', data.playerSide);
        // Store playerSide for potential use
        // Note: This is informational, the actual playerSide is managed by the component
      }
      this.eventHandlers.onPlayerJoined?.(data);
    });
  }

  /**
   * Setup message handlers (legacy compatibility)
   */
  private setupMessageHandlers() {
    // This method is kept for compatibility with existing code
    // Socket.IO handles events differently than raw WebSocket
  }

  /**
   * Start ping interval for connection health
   */
  private startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 20000); // 20 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Start the game
   */
  startGame() {
    if (this.socket?.connected) {
      console.log('Starting game...');
      this.socket.emit('start_game', {
        tournamentId: this.tournamentId,
        matchId: this.matchId,
        gameSpeed: this.gameSpeed
      });
    } else {
      console.error('Cannot start game: Socket not connected');
    }
  }

  /**
   * Pause the game
   */
  pauseGame() {
    if (this.socket?.connected) {
      console.log('Pausing game...');
      this.socket.emit('pause_game', {
        tournamentId: this.tournamentId,
        matchId: this.matchId
      });
    } else {
      console.error('Cannot pause game: Socket not connected');
    }
  }

  /**
   * Reset the game
   */
  resetGame() {
    if (this.socket?.connected) {
      console.log('Resetting game...');
      this.socket.emit('reset_game', {
        tournamentId: this.tournamentId,
        matchId: this.matchId,
        gameSpeed: this.gameSpeed
      });
    } else {
      console.error('Cannot reset game: Socket not connected');
    }
  }

  /**
   * Send paddle movement
   */
  sendPaddleMovement(direction: number) {
    if (this.socket?.connected) {
      this.socket.emit('paddle_movement', {
        tournamentId: this.tournamentId,
        matchId: this.matchId,
        userId: this.userId,
        direction
      });
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.tournamentId && this.matchId && this.userId) {
        // Don't pass roomId on reconnect, let it be regenerated
        this.connect(this.tournamentId, this.matchId, this.userId, undefined, undefined, this.gameSpeed)
          .catch(error => {
            console.error('Reconnection failed:', error);
          });
      }
    }, delay);
  }
}

export default SocketIOService;
