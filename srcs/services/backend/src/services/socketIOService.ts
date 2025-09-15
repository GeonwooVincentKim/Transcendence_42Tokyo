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
    player1Id?: number;
    player2Id?: number;
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

    // Determine player position
    const userIdNum = userId === 'anonymous' ? 0 : parseInt(userId);
    if (!room.gameState.player1Id) {
      room.gameState.player1Id = userIdNum;
    } else if (!room.gameState.player2Id && room.gameState.player1Id !== userIdNum) {
      room.gameState.player2Id = userIdNum;
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
    const userIdNum = userId === 'anonymous' ? 0 : parseInt(userId);
    if (room.gameState.player1Id === userIdNum) {
      room.gameState.player1Id = undefined;
      room.gameState.player1Ready = false;
    }
    if (room.gameState.player2Id === userIdNum) {
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
    const userIdNum = userId === 'anonymous' ? 0 : parseInt(userId);
    if (room.gameState.player1Id === userIdNum) {
      room.gameState.player1Ready = ready;
    } else if (room.gameState.player2Id === userIdNum) {
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
      this.broadcastToRoom(roomId, 'game_start', {
        roomState: room.gameState,
        message: 'Both players ready! Starting game...'
      });

      // Set game status to playing after a short delay
      setTimeout(() => {
        room.gameState.status = 'playing';
        this.broadcastToRoom(roomId, 'game_playing', {
          roomState: room.gameState,
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

    room.gameState.gameData = gameState;

    // Broadcast to other players (not the sender)
    const socket = room.players.get(userId);
    if (socket) {
      socket.to(roomId).emit('game_state_update', {
        gameState,
        fromPlayer: userId
      });
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
}

export default SocketIOService;
