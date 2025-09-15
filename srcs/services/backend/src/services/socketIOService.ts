/**
 * Socket.IO Service for Real-time Game Synchronization
 * Provides automatic fallback and reconnection capabilities
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface GameRoom {
  id: string;
  tournamentId: number;
  matchId: number;
  players: Map<string, any>; // Socket.IO socket
  gameState: {
    status: 'waiting' | 'ready' | 'playing' | 'finished';
    player1Id?: string; // Changed to string to support unique player IDs
    player2Id?: string; // Changed to string to support unique player IDs
    player1Ready: boolean;
    player2Ready: boolean;
    gameData?: any;
  };
}

class SocketIOService {
  private io: SocketIOServer;
  private gameRooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map(); // userId -> roomId

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? ['http://localhost:3000', 'http://localhost:80', 'http://frontend:80']
          : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'], // Enable fallback to polling
      allowEIO3: true // Backward compatibility
    });

    this.setupSocketHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Socket.IO connection established: ${socket.id}`);

      // Handle joining game room
      socket.on('join_game_room', (data: { tournamentId: number, matchId: number, userId: string }) => {
        this.joinGameRoom(socket, data.tournamentId, data.matchId, data.userId);
      });

      // Handle leaving game room
      socket.on('leave_game_room', (data: { userId: string }) => {
        this.leaveGameRoom(data.userId);
      });

      // Handle player ready status
      socket.on('player_ready', (data: { userId: string, ready: boolean }) => {
        this.setPlayerReady(data.userId, data.ready);
      });

      // Handle game state updates
      socket.on('game_state_update', (data: { userId: string, gameState: any }) => {
        this.updateGameState(data.userId, data.gameState);
      });

      // Handle game end
      socket.on('game_end', (data: { userId: string, gameResult: any }) => {
        this.endGame(data.userId, data.gameResult);
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Socket.IO disconnected: ${socket.id}, reason: ${reason}`);
        // Find and remove player from any room
        for (const [userId, roomId] of this.playerRooms.entries()) {
          const room = this.gameRooms.get(roomId);
          if (room && room.players.get(userId) === socket) {
            this.leaveGameRoom(userId);
            break;
          }
        }
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to Socket.IO server',
        socketId: socket.id
      });
    });
  }

  /**
   * Join a game room
   */
  private joinGameRoom(socket: any, tournamentId: number, matchId: number, userId: string) {
    const roomId = `tournament-${tournamentId}-match-${matchId}`;
    
    // Get or create game room
    let room = this.gameRooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        tournamentId,
        matchId,
        players: new Map(),
        gameState: {
          status: 'waiting',
          player1Ready: false,
          player2Ready: false
        }
      };
      this.gameRooms.set(roomId, room);
    }

    // Add player to room
    room.players.set(userId, socket);
    this.playerRooms.set(userId, roomId);

    // Join Socket.IO room for efficient broadcasting
    socket.join(roomId);

    // Determine player position - use string userId instead of numeric conversion
    if (!room.gameState.player1Id) {
      room.gameState.player1Id = userId;
    } else if (!room.gameState.player2Id && room.gameState.player1Id !== userId) {
      room.gameState.player2Id = userId;
    }

    console.log(`Player ${userId} joined room ${roomId}`, {
      player1Id: room.gameState.player1Id,
      player2Id: room.gameState.player2Id,
      totalPlayers: room.players.size
    });

    // Notify all players in room
    this.broadcastToRoom(roomId, 'player_joined', {
      userId,
      roomState: room.gameState,
      message: `Player ${userId} joined the game room`
    });

    // Check if both players are ready
    this.checkGameReadiness(roomId);
  }

  /**
   * Leave a game room
   */
  private leaveGameRoom(userId: string) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return;

    const room = this.gameRooms.get(roomId);
    if (!room) return;

    const socket = room.players.get(userId);
    if (socket) {
      socket.leave(roomId);
    }

    // Remove player from room
    room.players.delete(userId);
    this.playerRooms.delete(userId);

    // Reset player positions if needed
    if (room.gameState.player1Id === userId) {
      room.gameState.player1Id = undefined;
      room.gameState.player1Ready = false;
    }
    if (room.gameState.player2Id === userId) {
      room.gameState.player2Id = undefined;
      room.gameState.player2Ready = false;
    }

    console.log(`Player ${userId} left room ${roomId}`);

    // Notify remaining players
    this.broadcastToRoom(roomId, 'player_left', {
      userId,
      roomState: room.gameState,
      message: `Player ${userId} left the game room`
    });

    // Clean up empty room
    if (room.players.size === 0) {
      this.gameRooms.delete(roomId);
    }
  }

  /**
   * Player ready status
   */
  private setPlayerReady(userId: string, ready: boolean) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return;

    const room = this.gameRooms.get(roomId);
    if (!room) return;

    // Set ready status
    if (room.gameState.player1Id === userId) {
      room.gameState.player1Ready = ready;
    } else if (room.gameState.player2Id === userId) {
      room.gameState.player2Ready = ready;
    }

    console.log(`Player ${userId} ready status: ${ready}`, room.gameState);

    // Notify all players
    this.broadcastToRoom(roomId, 'player_ready', {
      userId,
      ready,
      roomState: room.gameState
    });

    // Check if both players are ready
    this.checkGameReadiness(roomId);
  }

  /**
   * Start game when both players are ready
   */
  private checkGameReadiness(roomId: string) {
    const room = this.gameRooms.get(roomId);
    if (!room) return;

    const { player1Id, player2Id, player1Ready, player2Ready } = room.gameState;

    // Check if both players are present and ready
    if (player1Id && player2Id && player1Ready && player2Ready) {
      room.gameState.status = 'ready';
      
      console.log(`Starting game in room ${roomId}`);
      
      // Notify all players to start game
      console.log(`Broadcasting game_start to room ${roomId} with ${room.players.size} players`);
      this.broadcastToRoom(roomId, 'game_start', {
        roomState: room.gameState,
        message: 'Both players ready! Starting game...'
      });

      // Set game status to playing after a short delay
      setTimeout(() => {
        room.gameState.status = 'playing';
        
        // Initialize game data
        const initialGameData = {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 0,
          rightScore: 0
        };
        
        room.gameState.gameData = initialGameData;
        
        console.log(`Broadcasting game_playing to room ${roomId} with ${room.players.size} players`);
        this.broadcastToRoom(roomId, 'game_playing', {
          roomState: room.gameState,
          gameState: initialGameData,
          message: 'Game is now playing!'
        });
      }, 2000);
    }
  }

  /**
   * Broadcast message to all players in a room
   */
  private broadcastToRoom(roomId: string, event: string, data: any) {
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Handle game state updates
   */
  private updateGameState(userId: string, gameState: any) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return;

    const room = this.gameRooms.get(roomId);
    if (!room) return;

    // Handle different types of game state updates
    if (gameState.type === 'paddle_move') {
      // Handle paddle movement
      console.log('Paddle move from player:', userId, gameState);
      
      // Update room's game data with paddle position
      if (!room.gameState.gameData) {
        room.gameState.gameData = {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 0,
          rightScore: 0
        };
      }
      
      // Update the specific paddle position
      if (gameState.player === 'left') {
        room.gameState.gameData.leftPaddle = { y: gameState.y };
      } else if (gameState.player === 'right') {
        room.gameState.gameData.rightPaddle = { y: gameState.y };
      }

      // Broadcast paddle move to other players (not the sender)
      const socket = room.players.get(userId);
      if (socket) {
        socket.to(roomId).emit('game_state_update', {
          gameState: gameState,
          fromPlayer: userId
        });
      }
    } else {
      // Handle other game state updates
      room.gameState.gameData = gameState;

      // Broadcast to other players (not the sender)
      const socket = room.players.get(userId);
      if (socket) {
        socket.to(roomId).emit('game_state_update', {
          gameState: gameState,
          fromPlayer: userId
        });
      }
    }
  }

  /**
   * Handle game end
   */
  private endGame(userId: string, gameResult: any) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return;

    const room = this.gameRooms.get(roomId);
    if (!room) return;

    room.gameState.status = 'finished';

    this.broadcastToRoom(roomId, 'game_end', {
      gameResult,
      roomState: room.gameState,
      message: 'Game finished!'
    });
  }

  /**
   * Get room state
   */
  getRoomState(roomId: string) {
    const room = this.gameRooms.get(roomId);
    return room ? room.gameState : null;
  }

  /**
   * Get Socket.IO server instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Clear all tournament game rooms and player mappings
   * This is used when cleaning up tournament data
   */
  clearAllGameRooms(): void {
    console.log('Clearing all game rooms...');
    console.log(`Clearing ${this.gameRooms.size} game rooms and ${this.playerRooms.size} player mappings`);
    
    // Clear all game rooms
    this.gameRooms.clear();
    
    // Clear all player room mappings
    this.playerRooms.clear();
    
    console.log('✅ All game rooms cleared successfully');
  }
}

export default SocketIOService;
