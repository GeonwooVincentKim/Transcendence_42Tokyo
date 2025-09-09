/**
 * WebSocket Service for Real-time Game Synchronization
 */

interface GameRoom {
  id: string;
  tournamentId: number;
  matchId: number;
  players: Map<string, WebSocket>;
  gameState: {
    status: 'waiting' | 'ready' | 'playing' | 'finished';
    player1Id?: number;
    player2Id?: number;
    player1Ready: boolean;
    player2Ready: boolean;
    gameData?: any;
  };
}

class WebSocketService {
  private gameRooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map(); // userId -> roomId

  constructor() {}

  /**
   * Join a game room
   */
  joinGameRoom(connection: WebSocket, userId: string, tournamentId: number, matchId: number) {
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
    room.players.set(userId, connection);
    this.playerRooms.set(userId, roomId);

    // Determine player position
    if (!room.gameState.player1Id) {
      room.gameState.player1Id = parseInt(userId);
    } else if (!room.gameState.player2Id && room.gameState.player1Id !== parseInt(userId)) {
      room.gameState.player2Id = parseInt(userId);
    }

    console.log(`Player ${userId} joined room ${roomId}`, {
      player1Id: room.gameState.player1Id,
      player2Id: room.gameState.player2Id,
      totalPlayers: room.players.size
    });

    // Notify all players in room
    this.broadcastToRoom(roomId, {
      type: 'player_joined',
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
  leaveGameRoom(userId: string) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return;

    const room = this.gameRooms.get(roomId);
    if (!room) return;

    // Remove player from room
    room.players.delete(userId);
    this.playerRooms.delete(userId);

    // Reset player positions if needed
    if (room.gameState.player1Id === parseInt(userId)) {
      room.gameState.player1Id = undefined;
      room.gameState.player1Ready = false;
    }
    if (room.gameState.player2Id === parseInt(userId)) {
      room.gameState.player2Id = undefined;
      room.gameState.player2Ready = false;
    }

    console.log(`Player ${userId} left room ${roomId}`);

    // Notify remaining players
    this.broadcastToRoom(roomId, {
      type: 'player_left',
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
  setPlayerReady(userId: string, ready: boolean) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return;

    const room = this.gameRooms.get(roomId);
    if (!room) return;

    // Set ready status
    if (room.gameState.player1Id === parseInt(userId)) {
      room.gameState.player1Ready = ready;
    } else if (room.gameState.player2Id === parseInt(userId)) {
      room.gameState.player2Ready = ready;
    }

    console.log(`Player ${userId} ready status: ${ready}`, room.gameState);

    // Notify all players
    this.broadcastToRoom(roomId, {
      type: 'player_ready',
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
      this.broadcastToRoom(roomId, {
        type: 'game_start',
        roomState: room.gameState,
        message: 'Both players ready! Starting game...'
      });

      // Set game status to playing after a short delay
      setTimeout(() => {
        room.gameState.status = 'playing';
        this.broadcastToRoom(roomId, {
          type: 'game_playing',
          roomState: room.gameState,
          message: 'Game is now playing!'
        });
      }, 2000);
    }
  }

  /**
   * Broadcast message to all players in a room
   */
  private broadcastToRoom(roomId: string, message: any) {
    const room = this.gameRooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    
    room.players.forEach((connection, userId) => {
      try {
        if (connection.readyState === WebSocket.OPEN) {
          connection.send(messageStr);
        }
      } catch (error) {
        console.error(`Failed to send message to player ${userId}:`, error);
        // Remove disconnected player
        this.leaveGameRoom(userId);
      }
    });
  }

  /**
   * Handle game state updates
   */
  updateGameState(userId: string, gameState: any) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return;

    const room = this.gameRooms.get(roomId);
    if (!room) return;

    room.gameState.gameData = gameState;

    // Broadcast to other players (not the sender)
    room.players.forEach((connection, otherUserId) => {
      if (otherUserId !== userId) {
        try {
          if (connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify({
              type: 'game_state_update',
              gameState,
              fromPlayer: userId
            }));
          }
        } catch (error) {
          console.error(`Failed to send game state to player ${otherUserId}:`, error);
        }
      }
    });
  }

  /**
   * Handle game end
   */
  endGame(userId: string, gameResult: any) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return;

    const room = this.gameRooms.get(roomId);
    if (!room) return;

    room.gameState.status = 'finished';

    this.broadcastToRoom(roomId, {
      type: 'game_end',
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
}

export default WebSocketService;
