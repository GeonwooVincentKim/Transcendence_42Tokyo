/**
 * Socket.IO Service for Real-time Game Synchronization
 * Provides automatic fallback and reconnection capabilities
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Extend Socket type to include userId
declare module 'socket.io' {
  interface Socket {
    userId?: string;
  }
}

interface GameRoom {
  id: string;
  tournamentId: number;
  matchId: number;
  players: Map<string, any>; // Socket.IO socket
  gameState: {
    status: 'waiting' | 'ready' | 'playing' | 'paused' | 'finished';
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
  private playerRooms: Map<string, string> = new Map();
  private gameLoops: Map<string, NodeJS.Timeout> = new Map(); // userId -> roomId
  private playerIdMapping: Map<string, string> = new Map(); // tempUserId -> realUserId

  constructor(httpServer: HTTPServer) {
    // Allow CORS from environment variable or default origins
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',')
      : process.env.NODE_ENV === 'production'
        ? ['http://localhost:3000', 'http://localhost:80', 'http://frontend:80']
        : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002', 'http://127.0.0.1:5173'];
    
    // In development or when CORS_ALLOW_ALL is set, allow all origins
    // This is essential for IP-based access (e.g., 192.168.x.x)
    const corsOrigin = (process.env.NODE_ENV === 'development' || process.env.CORS_ALLOW_ALL === 'true')
      ? true // Allow all origins in development or when explicitly enabled
      : allowedOrigins; // Use specific origins in production
    
    console.log('🔍 Socket.IO CORS configuration:', {
      NODE_ENV: process.env.NODE_ENV,
      CORS_ALLOW_ALL: process.env.CORS_ALLOW_ALL,
      corsOrigin: corsOrigin === true ? 'ALL ORIGINS' : corsOrigin
    });
    
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigin,
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
      socket.on('join_game_room', (data: { roomId?: string, tournamentId: number, matchId: number, userId: string, token?: string, playerSide?: 'left' | 'right' }) => {
        console.log('\n' + '🟢'.repeat(40));
        console.log('🎯 BACKEND RECEIVED join_game_room EVENT');
        console.log('🟢'.repeat(40));
        console.log('DATA RECEIVED:');
        console.log('   roomId:', data.roomId);
        console.log('   tournamentId:', data.tournamentId);
        console.log('   matchId:', data.matchId);
        console.log('   userId:', data.userId);
        console.log('   token:', data.token ? 'PROVIDED' : 'NOT PROVIDED');
        console.log('   playerSide:', data.playerSide);
        console.log('   playerSide type:', typeof data.playerSide);
        console.log('   playerSide === undefined:', data.playerSide === undefined);
        console.log('   playerSide === null:', data.playerSide === null);
        console.log('   playerSide === "left":', data.playerSide === 'left');
        console.log('   playerSide === "right":', data.playerSide === 'right');
        console.log('   socketId:', socket.id);
        console.log('🔍 Full data object:');
        console.log(JSON.stringify(data, null, 2));
        console.log('🟢'.repeat(40) + '\n');
        
        // If token is provided, try to extract real user ID
        if (data.token) {
          this.extractUserIdFromToken(data.token).then(realUserId => {
            if (realUserId) {
              console.log('🔍 Extracted real user ID from token:', realUserId, '(original userId:', data.userId, ')');
              socket.userId = realUserId; // Store real user ID in socket
              
              // Store mapping between temp userId and real userId
              this.playerIdMapping.set(data.userId, realUserId);
              console.log('🔍 Stored player ID mapping:', data.userId, '->', realUserId);
              
              if (data.roomId) {
                this.joinGameRoomById(socket, data.roomId, realUserId, data.playerSide);
              } else {
                this.joinGameRoom(socket, data.tournamentId, data.matchId, realUserId, data.playerSide);
              }
            } else {
              console.log('⚠️ Failed to extract user ID from token, using provided userId:', data.userId);
              if (data.roomId) {
                this.joinGameRoomById(socket, data.roomId, data.userId, data.playerSide);
              } else {
                this.joinGameRoom(socket, data.tournamentId, data.matchId, data.userId, data.playerSide);
              }
            }
          }).catch(error => {
            console.error('❌ Error extracting user ID from token:', error);
            if (data.roomId) {
              this.joinGameRoomById(socket, data.roomId, data.userId, data.playerSide);
            } else {
              this.joinGameRoom(socket, data.tournamentId, data.matchId, data.userId, data.playerSide);
            }
          });
        } else {
          console.log('⚠️ No token provided, using provided userId:', data.userId);
          if (data.roomId) {
            this.joinGameRoomById(socket, data.roomId, data.userId, data.playerSide);
          } else {
            this.joinGameRoom(socket, data.tournamentId, data.matchId, data.userId, data.playerSide);
          }
        }
      });

      // Handle leaving game room
      socket.on('leave_game_room', (data: { userId: string }) => {
        this.leaveGameRoom(data.userId);
      });

      // Handle player ready status
      socket.on('player_ready', (data: { userId: string, ready: boolean }) => {
        this.setPlayerReady(data.userId, data.ready);
      });

      // Handle start game request
      socket.on('start_game', (data: { tournamentId: number, matchId: number }) => {
        console.log('🔍 Backend received start_game:', data);
        this.handleStartGame(socket, data.tournamentId, data.matchId);
      });

      // Handle pause game request
      socket.on('pause_game', (data: { tournamentId: number, matchId: number }) => {
        console.log('🔍 Backend received pause_game:', data);
        this.handlePauseGame(socket, data.tournamentId, data.matchId);
      });

      // Handle reset game request
      socket.on('reset_game', (data: { tournamentId: number, matchId: number }) => {
        console.log('🔍 Backend received reset_game:', data);
        this.handleResetGame(socket, data.tournamentId, data.matchId);
      });

      // Handle paddle movement
      socket.on('paddle_movement', (data: { tournamentId: number, matchId: number, userId: string, direction: number }) => {
        this.handlePaddleMovement(data.userId, data.direction);
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

      // Handle user online status updates
      socket.on('user_online', async (data: { userId: string }) => {
        try {
          const { FriendsService } = await import('./friendsService.js');
          await FriendsService.updateOnlineStatus(data.userId, 'online');
          console.log(`User ${data.userId} is now online`);
          
          // Broadcast to all connected users that this user is online
          this.io.emit('user_status_changed', {
            userId: data.userId,
            status: 'online'
          });
        } catch (error) {
          console.error('Error updating user online status:', error);
        }
      });

      // Handle user offline status updates
      socket.on('user_offline', async (data: { userId: string }) => {
        try {
          const { FriendsService } = await import('./friendsService.js');
          await FriendsService.updateOnlineStatus(data.userId, 'offline');
          console.log(`User ${data.userId} is now offline`);
          
          // Broadcast to all connected users that this user is offline
          this.io.emit('user_status_changed', {
            userId: data.userId,
            status: 'offline'
          });
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      });

      // Handle chat channel creation
      socket.on('channel_created', (data: { channel: any }) => {
        console.log('Channel created, broadcasting to all users:', data.channel);
        // Broadcast new channel to all connected users
        this.io.emit('channel_created', data);
      });

      // Handle chat channel updates
      socket.on('channel_updated', (data: { channel: any }) => {
        console.log('Channel updated, broadcasting to all users:', data.channel);
        // Broadcast channel update to all connected users
        this.io.emit('channel_updated', data);
      });

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        console.log(`Socket.IO disconnected: ${socket.id}, reason: ${reason}`);
        
        // Update user status to offline on disconnect
        if (socket.userId) {
          try {
            const { FriendsService } = await import('./friendsService.js');
            await FriendsService.updateOnlineStatus(socket.userId, 'offline');
            console.log(`User ${socket.userId} went offline due to disconnect`);
            
            // Broadcast to all connected users that this user is offline
            this.io.emit('user_status_changed', {
              userId: socket.userId,
              status: 'offline'
            });
          } catch (error) {
            console.error('Error updating user offline status on disconnect:', error);
          }
        }
        
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
   * Join a game room by roomId
   */
  private joinGameRoomById(socket: any, roomId: string, userId: string, requestedSide?: 'left' | 'right') {
    console.log('='.repeat(80));
    console.log(`🎯 joinGameRoomById CALLED`);
    console.log(`   roomId: ${roomId}`);
    console.log(`   userId: ${userId}`);
    console.log(`   requestedSide: ${requestedSide} (type: ${typeof requestedSide})`);
    console.log(`   socketId: ${socket.id}`);
    console.log('='.repeat(80));
    
    let tournamentId: number;
    let matchId: number;
    
    // Parse tournament and match IDs from roomId
    const tournamentMatch = roomId.match(/tournament-(\d+)-match-(\d+)/);
    if (tournamentMatch) {
      tournamentId = parseInt(tournamentMatch[1]);
      matchId = parseInt(tournamentMatch[2]);
      console.log(`🔍 Tournament room detected: tournamentId=${tournamentId}, matchId=${matchId}`);
    } else {
      // Check if roomId is a simple number (for regular multiplayer)
      const simpleRoomMatch = roomId.match(/^\d+$/);
      if (simpleRoomMatch) {
        tournamentId = 0; // Use 0 for non-tournament rooms
        matchId = parseInt(roomId); // Use the roomId as matchId
        console.log(`🔍 Simple multiplayer room detected: tournamentId=${tournamentId}, matchId=${matchId}`);
      } else {
        console.error('❌ Invalid roomId format:', roomId);
        console.log('Expected formats: "123" (simple number) or "tournament-{id}-match-{matchId}"');
        return;
      }
    }
    
    console.log(`🔍 Parsed tournamentId: ${tournamentId}, matchId: ${matchId}`);
    
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

    // Check if this userId is already in the room (reconnection)
    const existingPlayer = room.players.get(userId);
    if (existingPlayer) {
      console.log(`🔄 Player ${userId} reconnecting, updating socket (existing socket: ${existingPlayer.socket?.id}, new socket: ${socket.id})`);
      console.log(`🔍 Existing player data:`, existingPlayer);
      
      // IMPORTANT: Preserve the existing player's side!
      const preservedSide = existingPlayer.side || requestedSide || 'left';
      console.log(`🔍 Preserving player side: ${preservedSide} (existing: ${existingPlayer.side}, requested: ${requestedSide})`);
      
      // Update socket for existing player
      existingPlayer.socket = socket;
      // Make sure we keep the side!
      existingPlayer.side = preservedSide;
      
      socket.join(roomId);
      
      // Ensure player IDs are set in game state
      if (!room.gameState.player1Id) {
        room.gameState.player1Id = userId;
      } else if (!room.gameState.player2Id && room.gameState.player1Id !== userId) {
        room.gameState.player2Id = userId;
      }
      
      // Notify about reconnection
      this.broadcastToRoom(roomId, 'player_reconnected', {
        userId,
        roomState: room.gameState,
        message: `Player ${userId} reconnected`
      });
      
      // Check game readiness after reconnection
      this.checkGameReadiness(roomId);
      return; // Don't add as new player
    }
    
    // Check if room is full (2 players already)
    if (room.players.size >= 2) {
      const existingPlayerIds = Array.from(room.players.keys());
      console.log(`⚠️ Room ${roomId} is full! Current players: ${existingPlayerIds.join(', ')}, trying to join: ${userId}`);
      
      // Notify the player that room is full
      socket.emit('room_full', {
        roomId,
        message: 'Room is full. Maximum 2 players allowed.',
        currentPlayers: existingPlayerIds
      });
      return;
    }
    
    // Determine player side (left or right)
    // If client requested a specific side and it's available, use it
    // Otherwise, assign based on order (first player = left, second = right)
    let playerSide: 'left' | 'right';
    
    console.log('🔍 DETERMINING PLAYER SIDE:');
    console.log(`   requestedSide: ${requestedSide} (type: ${typeof requestedSide})`);
    console.log(`   requestedSide === undefined: ${requestedSide === undefined}`);
    console.log(`   requestedSide === null: ${requestedSide === null}`);
    console.log(`   requestedSide === 'left': ${requestedSide === 'left'}`);
    console.log(`   requestedSide === 'right': ${requestedSide === 'right'}`);
    console.log(`   playerCount in room: ${room.players.size}`);
    
    if (requestedSide) {
      // Check if requested side is already taken
      const currentPlayers = Array.from(room.players.values());
      console.log(`🔍 Current players in room:`, currentPlayers.map((p: any) => ({ userId: p.userId, side: p.side })));
      
      const sideAlreadyTaken = currentPlayers.some(
        (player: any) => player.side === requestedSide
      );
      
      console.log(`   Is ${requestedSide} already taken? ${sideAlreadyTaken}`);
      
      if (sideAlreadyTaken) {
        // Requested side is taken, assign the other side
        playerSide = requestedSide === 'left' ? 'right' : 'left';
        console.log(`⚠️ Player ${userId} requested ${requestedSide} but it's taken, assigning ${playerSide}`);
      } else {
        // Requested side is available
        playerSide = requestedSide;
        console.log(`✅ Player ${userId} assigned requested side: ${playerSide}`);
      }
    } else {
      // No side requested, assign based on order
      const playerCount = room.players.size;
      playerSide = playerCount === 0 ? 'left' : 'right';
      console.log(`❌ NO SIDE REQUESTED! Player ${userId} assigned side by order: ${playerSide} (playerCount: ${playerCount})`);
      console.log(`   This should not happen if frontend is sending playerSide correctly!`);
    }
    
    console.log(`🎯 FINAL DECISION: Player ${userId} will be on ${playerSide} side`);
    console.log('='.repeat(80));
    
    // Create player object with user information
    const playerInfo = {
      socket: socket,
      userId: socket.userId || userId, // Use socket.userId if available, fallback to userId
      side: playerSide,
      ready: false
    };
    
    // Add player to room
    room.players.set(userId, playerInfo);
    this.playerRooms.set(userId, roomId);
    socket.join(roomId);

    // Set player IDs in game state BEFORE logging
    if (!room.gameState.player1Id) {
      room.gameState.player1Id = userId;
      console.log(`✅ Set player1Id to ${userId}`);
    } else if (!room.gameState.player2Id && room.gameState.player1Id !== userId) {
      room.gameState.player2Id = userId;
      console.log(`✅ Set player2Id to ${userId}`);
    } else if (room.gameState.player1Id === userId) {
      console.log(`⚠️ Player ${userId} is already player1, skipping`);
    } else if (room.gameState.player2Id === userId) {
      console.log(`⚠️ Player ${userId} is already player2, skipping`);
    }

    console.log(`Player ${userId} joined room ${roomId} as ${playerSide}`, {
      player1Id: room.gameState.player1Id,
      player2Id: room.gameState.player2Id,
      totalPlayers: room.players.size,
      allPlayerIds: Array.from(room.players.keys())
    });

    // Notify all players
    this.broadcastToRoom(roomId, 'player_joined', {
      userId,
      roomState: room.gameState,
      message: `Player ${userId} joined the game room`
    });

    // Check if both players are ready
    this.checkGameReadiness(roomId);
  }

  /**
   * Join a game room
   */
  private joinGameRoom(socket: any, tournamentId: number, matchId: number, userId: string, requestedSide?: 'left' | 'right') {
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

    // Check if this userId is already in the room (reconnection)
    const existingPlayer = room.players.get(userId);
    if (existingPlayer) {
      console.log(`🔄 Player ${userId} reconnecting, updating socket`);
      console.log(`🔍 Existing player data:`, existingPlayer);
      
      // IMPORTANT: Preserve the existing player's side!
      const preservedSide = existingPlayer.side || requestedSide || 'left';
      console.log(`🔍 Preserving player side: ${preservedSide} (existing: ${existingPlayer.side}, requested: ${requestedSide})`);
      
      // Update socket for existing player
      if (typeof existingPlayer === 'object' && existingPlayer.socket) {
        existingPlayer.socket = socket;
        // Make sure we keep the side!
        existingPlayer.side = preservedSide;
      } else {
        // Convert old format to new format
        room.players.set(userId, {
          socket: socket,
          userId: userId,
          side: preservedSide,
          ready: existingPlayer.ready || false
        });
      }
      socket.join(roomId);
      // Notify about reconnection
      this.broadcastToRoom(roomId, 'player_reconnected', {
        userId,
        roomState: room.gameState,
        message: `Player ${userId} reconnected`
      });
      return; // Don't add as new player
    }
    
    // Determine player side (left or right)
    // If client requested a specific side and it's available, use it
    // Otherwise, assign based on order (first player = left, second = right)
    let playerSide: 'left' | 'right';
    
    if (requestedSide) {
      // Check if requested side is already taken
      const sideAlreadyTaken = Array.from(room.players.values()).some(
        (player: any) => player.side === requestedSide
      );
      
      if (sideAlreadyTaken) {
        // Requested side is taken, assign the other side
        playerSide = requestedSide === 'left' ? 'right' : 'left';
        console.log(`⚠️ Player ${userId} requested ${requestedSide} but it's taken, assigning ${playerSide}`);
      } else {
        // Requested side is available
        playerSide = requestedSide;
        console.log(`✅ Player ${userId} assigned requested side: ${playerSide}`);
      }
    } else {
      // No side requested, assign based on order
      const playerCount = room.players.size;
      playerSide = playerCount === 0 ? 'left' : 'right';
      console.log(`📍 Player ${userId} assigned side by order: ${playerSide}`);
    }
    
    // Create player object with user information
    const playerInfo = {
      socket: socket,
      userId: userId,
      side: playerSide,
      ready: false
    };
    
    // Add player to room
    room.players.set(userId, playerInfo);
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
    
    // Auto-start game loop if both players are present (for debugging)
    if (room.players.size === 2) {
      console.log(`Auto-starting game loop for room ${roomId} with 2 players`);
      
      // Set match status to active when both players join
      this.setMatchActive(tournamentId, matchId);
      
      setTimeout(() => {
        this.startGameLoop(roomId);
      }, 1000);
    }
  }

  /**
   * Leave a game room
   */
  private leaveGameRoom(userId: string) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) return;

    const room = this.gameRooms.get(roomId);
    if (!room) return;

    const playerInfo = room.players.get(userId);
    if (playerInfo && playerInfo.socket) {
      playerInfo.socket.leave(roomId);
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
      // Stop game loop if room is empty
      this.stopGameLoop(roomId);
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
    if (!room) {
      console.log(`❌ Room ${roomId} not found in checkGameReadiness`);
      return;
    }

    const { player1Id, player2Id, player1Ready, player2Ready, status } = room.gameState;
    const playersArray = Array.from(room.players.entries());
    
    console.log(`🔍 checkGameReadiness for room ${roomId}:`, {
      playersSize: room.players.size,
      player1Id,
      player2Id,
      player1Ready,
      player2Ready,
      status,
      allPlayerIds: playersArray.map(p => p[0])
    });

    // Ensure player IDs are set from the players map
    if (playersArray.length >= 1 && !room.gameState.player1Id) {
      room.gameState.player1Id = playersArray[0][0];
      console.log(`✅ Set player1Id to ${room.gameState.player1Id}`);
    }
    if (playersArray.length >= 2 && !room.gameState.player2Id) {
      room.gameState.player2Id = playersArray[1][0];
      console.log(`✅ Set player2Id to ${room.gameState.player2Id}`);
    }

    // Check if both players are present and game hasn't started yet
    // Auto-start game when both players join (no need for manual ready)
    if (room.players.size >= 2 && status !== 'ready' && status !== 'playing') {
      // Set player IDs from the players map (ensure they're set)
      if (playersArray.length >= 2) {
        room.gameState.player1Id = playersArray[0][0]; // First player's userId
        room.gameState.player2Id = playersArray[1][0]; // Second player's userId
        console.log(`✅ Updated player IDs: player1Id=${room.gameState.player1Id}, player2Id=${room.gameState.player2Id}`);
      }
      
      room.gameState.status = 'ready';
      room.gameState.player1Ready = true;
      room.gameState.player2Ready = true;
      
      console.log(`🎮 Starting game in room ${roomId} with players: ${room.gameState.player1Id} vs ${room.gameState.player2Id}`);
      
      // Notify all players to start game
      console.log(`📢 Broadcasting game_start to room ${roomId} with ${room.players.size} players`);
      this.broadcastToRoom(roomId, 'game_start', {
        roomState: room.gameState,
        message: 'Both players joined! Starting game...'
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
        
        // Start game loop for this room
        this.startGameLoop(roomId);
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
    } else if (gameState.type === 'game_reset') {
      // Handle game reset
      console.log('🔄 RESET REQUESTED by player:', userId);
      
      // Reset game data to initial state
      room.gameState.gameData = {
        leftPaddle: { y: 200 },
        rightPaddle: { y: 200 },
        ball: { x: 400, y: 200, dx: 5, dy: 3 },
        leftScore: 0,
        rightScore: 0
      };
      
      // Set game status to ready
      room.gameState.status = 'ready';
      
      // Stop current game loop
      this.stopGameLoop(roomId);
      
      // Broadcast reset to all players in the room (including the sender)
      console.log(`📡 Broadcasting reset to ${room.players.size} players in room ${roomId}`);
      
      this.broadcastToRoom(roomId, 'game_state_update', {
        gameState: room.gameState.gameData,
        fromPlayer: 'server',
        type: 'game_reset'
      });
      
      // Also broadcast the room state update
      this.broadcastToRoom(roomId, 'game_playing', {
        roomState: room.gameState,
        gameState: room.gameState.gameData,
        message: 'Game reset completed!'
      });
      
      // Additional explicit reset broadcast to ensure all players receive it
      this.broadcastToRoom(roomId, 'game_reset', {
        gameState: room.gameState.gameData,
        roomState: room.gameState,
        message: 'Game reset completed!'
      });
      
      console.log('✅ RESET COMPLETED for room:', roomId);
    } else if (gameState.type === 'game_pause') {
      // Handle game pause
      console.log('⏸️ PAUSE REQUESTED by player:', userId);
      
      // Set game status to paused
      room.gameState.status = 'paused';
      
      // Stop current game loop
      this.stopGameLoop(roomId);
      
      // Broadcast pause to all players in the room
      console.log(`📡 Broadcasting pause to ${room.players.size} players in room ${roomId}`);
      
      this.broadcastToRoom(roomId, 'game_state_update', {
        gameState: room.gameState.gameData,
        fromPlayer: 'server',
        type: 'game_pause'
      });
      
      // Also broadcast the room state update
      this.broadcastToRoom(roomId, 'game_playing', {
        roomState: room.gameState,
        gameState: room.gameState.gameData,
        message: 'Game paused!'
      });
      
      console.log('✅ PAUSE COMPLETED for room:', roomId);
    } else if (gameState.type === 'game_resume') {
      // Handle game resume
      console.log('▶️ RESUME REQUESTED by player:', userId);
      
      // Set game status to playing
      room.gameState.status = 'playing';
      
      // Start game loop again
      this.startGameLoop(roomId);
      
      // Broadcast resume to all players in the room
      console.log(`📡 Broadcasting resume to ${room.players.size} players in room ${roomId}`);
      
      this.broadcastToRoom(roomId, 'game_state_update', {
        gameState: room.gameState.gameData,
        fromPlayer: 'server',
        type: 'game_resume'
      });
      
      // Also broadcast the room state update
      this.broadcastToRoom(roomId, 'game_playing', {
        roomState: room.gameState,
        gameState: room.gameState.gameData,
        message: 'Game resumed!'
      });
      
      console.log('✅ RESUME COMPLETED for room:', roomId);
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
    
    // Stop game loop when game ends
    this.stopGameLoop(roomId);

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
   * Start game loop for a room
   */
  public async startGameLoop(roomId: string) {
    const room = this.gameRooms.get(roomId);
    if (!room || !room.gameState.gameData) return;

    // Clear existing game loop if any
    const existingLoop = this.gameLoops.get(roomId);
    if (existingLoop) {
      clearInterval(existingLoop);
    }

    console.log(`Starting game loop for room ${roomId}`);
    
    // Game loop runs at 30 FPS (33ms intervals)
    const gameLoop = setInterval(() => {
      // Debug logging disabled for cleaner console
      // console.log(`Game loop tick for room ${roomId}`);
      this.updateGamePhysics(roomId);
    }, 33);

    this.gameLoops.set(roomId, gameLoop);
  }

  /**
   * Stop game loop for a room
   */
  private stopGameLoop(roomId: string) {
    const gameLoop = this.gameLoops.get(roomId);
    if (gameLoop) {
      clearInterval(gameLoop);
      this.gameLoops.delete(roomId);
      console.log(`Stopped game loop for room ${roomId}`);
    }
  }

  /**
   * Update game physics (ball movement, collisions, scoring)
   */
  private async updateGamePhysics(roomId: string) {
    const room = this.gameRooms.get(roomId);
    if (!room || !room.gameState.gameData || room.gameState.status !== 'playing') {
      // Don't log when paused to reduce console noise
      if (room?.gameState?.status !== 'paused') {
        console.log(`Game physics update skipped for room ${roomId}:`, {
          roomExists: !!room,
          hasGameData: !!room?.gameState?.gameData,
          status: room?.gameState?.status
        });
      }
      return;
    }

    const gameData = room.gameState.gameData;
    
    // Ensure ball exists and has required properties
    if (!gameData.ball || typeof gameData.ball.x !== 'number' || typeof gameData.ball.y !== 'number') {
      console.log(`⚠️ Ball data is invalid, reinitializing for room ${roomId}:`, gameData.ball);
      gameData.ball = { x: 400, y: 200, dx: 5, dy: 3 };
    }
    
    // Ensure ball has velocity properties
    if (typeof gameData.ball.dx !== 'number' || typeof gameData.ball.dy !== 'number') {
      gameData.ball.dx = gameData.ball.dx || 5;
      gameData.ball.dy = gameData.ball.dy || 3;
    }
    
    // Debug logging disabled for cleaner console
    // console.log(`Updating game physics for room ${roomId}, ball position:`, gameData.ball);
    
    // Update ball position
    gameData.ball.x += gameData.ball.dx;
    gameData.ball.y += gameData.ball.dy;

    // Ball collision with top and bottom walls
    if (gameData.ball.y <= 5 || gameData.ball.y >= 395) {
      gameData.ball.dy = -gameData.ball.dy;
    }

    // Ball collision with left paddle
    if (gameData.ball.x <= 20 && 
        gameData.ball.x >= 10 && 
        gameData.ball.y >= gameData.leftPaddle.y && 
        gameData.ball.y <= gameData.leftPaddle.y + 100) {
      gameData.ball.dx = -gameData.ball.dx;
      // Add some randomness to ball direction
      gameData.ball.dy += (Math.random() - 0.5) * 2;
    }

    // Ball collision with right paddle
    if (gameData.ball.x >= 780 && 
        gameData.ball.x <= 790 && 
        gameData.ball.y >= gameData.rightPaddle.y && 
        gameData.ball.y <= gameData.rightPaddle.y + 100) {
      gameData.ball.dx = -gameData.ball.dx;
      // Add some randomness to ball direction
      gameData.ball.dy += (Math.random() - 0.5) * 2;
    }

    // Scoring
    if (gameData.ball.x < 0) {
      // Right player scores
      gameData.rightScore++;
      this.resetBall(gameData);
    } else if (gameData.ball.x > 800) {
      // Left player scores
      gameData.leftScore++;
      this.resetBall(gameData);
    }

    // Check for game end condition (10 points)
    const WINNING_SCORE = 10;
    if (gameData.leftScore >= WINNING_SCORE || gameData.rightScore >= WINNING_SCORE) {
      const winner = gameData.leftScore >= WINNING_SCORE ? 'left' : 'right';
      console.log(`🎯 GAME ENDED! Winner: ${winner}, Final score: ${gameData.leftScore} - ${gameData.rightScore}`);
      
      // Stop game loop
      this.stopGameLoop(roomId);
      
      // Set game status to finished
      room.gameState.status = 'finished';
      
      // Save tournament match result if this is a tournament game
      console.log(`💾 Attempting to save tournament match result for room: ${roomId}`);
      await this.saveTournamentMatchResult(roomId, gameData, winner);
      
      // Broadcast game end
      console.log(`📡 Broadcasting game end to room ${roomId}:`, {
        winner,
        leftScore: gameData.leftScore,
        rightScore: gameData.rightScore
      });
      
      this.broadcastToRoom(roomId, 'game_end', {
        gameResult: {
          winner,
          leftScore: gameData.leftScore,
          rightScore: gameData.rightScore
        },
        roomState: room.gameState,
        message: 'Game finished!'
      });
      
      return; // Exit early since game ended
    }

    // Broadcast updated game state to all players in the room
    // Debug logging disabled for cleaner console
    // console.log(`Broadcasting game state update to room ${roomId}:`, {
    //   ball: gameData.ball,
    //   leftScore: gameData.leftScore,
    //   rightScore: gameData.rightScore,
    //   players: room.players.size
    // });
    
    this.broadcastToRoom(roomId, 'game_state_update', {
      gameState: gameData,
      fromPlayer: 'server'
    });
  }

  /**
   * Reset ball to center after scoring
   */
  private resetBall(gameData: any) {
    gameData.ball.x = 400;
    gameData.ball.y = 200;
    gameData.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5;
    gameData.ball.dy = (Math.random() - 0.5) * 6;
  }

  /**
   * Save tournament match result to database
   */
  private async saveTournamentMatchResult(roomId: string, gameData: any, winner: string) {
    try {
      console.log(`🔍 Parsing roomId: "${roomId}"`);
      
      // Check if this is a tournament game
      // Support both formats: "tournament-{id}-match-{matchId}" and "{tournamentId}-{matchId}"
      let tournamentId: number;
      let matchId: number;
      
      if (roomId.startsWith('tournament-') && roomId.includes('-match-')) {
        // Format: "tournament-{id}-match-{matchId}"
        const parts = roomId.split('-');
        console.log(`🔍 Parsed parts:`, parts);
        tournamentId = parseInt(parts[1]);
        matchId = parseInt(parts[3]);
        console.log(`🔍 Parsed tournamentId: ${tournamentId}, matchId: ${matchId}`);
      } else if (roomId.includes('-') && !roomId.startsWith('tournament-')) {
        // Format: "{tournamentId}-{matchId}"
        const parts = roomId.split('-');
        console.log(`🔍 Parsed parts:`, parts);
        tournamentId = parseInt(parts[0]);
        matchId = parseInt(parts[1]);
        console.log(`🔍 Parsed tournamentId: ${tournamentId}, matchId: ${matchId}`);
      } else {
        console.log('ℹ️ Not a tournament game, skipping match result save');
        return;
      }
      
      if (isNaN(tournamentId) || isNaN(matchId)) {
        console.log('⚠️ Invalid tournament or match ID in room:', roomId);
        console.log(`⚠️ tournamentId: ${tournamentId}, matchId: ${matchId}`);
        console.log('⚠️ This usually means the frontend is not setting the roomId correctly');
        console.log('⚠️ Expected format: tournament-{id}-match-{matchId}');
        console.log('⚠️ Actual roomId:', roomId);
        return;
      }

      // Handle regular multiplayer games (tournamentId = 0) - CHECK THIS FIRST
      if (tournamentId === 0) {
        console.log('🎮 Regular multiplayer game detected, updating user statistics directly');
        await this.updateRegularMultiplayerStatistics(roomId, gameData, winner);
        return;
      }

      console.log(`💾 Saving tournament match result: Tournament ${tournamentId}, Match ${matchId}`);
      
      // Import TournamentService dynamically to avoid circular dependency
      const { TournamentService } = await import('./tournamentService.js');
      
      // Get match details to determine winner ID
      const match = await TournamentService.getMatch(matchId);
      if (!match) {
        console.log('⚠️ Match not found:', matchId);
        return;
      }

      // Check match status and set to active if needed
      if (match.status !== 'active') {
        console.log(`🔄 Match ${matchId} is ${match.status}, setting to active`);
        await this.setMatchActive(tournamentId, matchId);
        
        // Re-fetch match to get updated status
        const updatedMatch = await TournamentService.getMatch(matchId);
        if (!updatedMatch || updatedMatch.status !== 'active') {
          console.log('⚠️ Failed to set match to active status');
          return;
        }
      }

      // Determine winner ID based on game result and actual player sides
      // Get the room to find which player is on which side
      const room = this.gameRooms.get(roomId);
      if (!room) {
        console.log('⚠️ Room not found when determining winner');
        return;
      }

      // Find which player is on which side
      const players = Array.from(room.players.values());
      const leftPlayer = players.find((p: any) => p.side === 'left');
      const rightPlayer = players.find((p: any) => p.side === 'right');
      
      console.log(`🔍 Players in room:`, {
        leftPlayer: leftPlayer ? { userId: leftPlayer.userId, side: leftPlayer.side } : 'none',
        rightPlayer: rightPlayer ? { userId: rightPlayer.userId, side: rightPlayer.side } : 'none'
      });

      let winnerId: number;
      let player1Score: number;
      let player2Score: number;

      // Determine winner based on which side won
      if (winner === 'left' && leftPlayer) {
        // Left side won - need to find which tournament participant this is
        const leftUserId = leftPlayer.userId;
        // Check if leftUserId matches player1 or player2 in the match
        if (match.player1_id && String(match.player1_id) === String(leftUserId)) {
          winnerId = match.player1_id;
        } else if (match.player2_id && String(match.player2_id) === String(leftUserId)) {
          winnerId = match.player2_id;
        } else {
          console.error(`❌ Could not match left player ${leftUserId} to tournament participant`);
          return;
        }
        player1Score = gameData.leftScore;
        player2Score = gameData.rightScore;
      } else if (winner === 'right' && rightPlayer) {
        // Right side won - need to find which tournament participant this is
        const rightUserId = rightPlayer.userId;
        if (match.player1_id && String(match.player1_id) === String(rightUserId)) {
          winnerId = match.player1_id;
        } else if (match.player2_id && String(match.player2_id) === String(rightUserId)) {
          winnerId = match.player2_id;
        } else {
          console.error(`❌ Could not match right player ${rightUserId} to tournament participant`);
          return;
        }
        player1Score = gameData.rightScore;
        player2Score = gameData.leftScore;
      } else {
        console.error(`❌ Could not determine winner: winner=${winner}, leftPlayer=${!!leftPlayer}, rightPlayer=${!!rightPlayer}`);
        return;
      }

      console.log(`🏆 Match result: Winner ID ${winnerId}, Scores: ${player1Score} - ${player2Score}`);

      // Update match result in database
      console.log('📝 Updating match result in database...');
      await TournamentService.updateMatchResult(
        matchId,
        winnerId,
        player1Score,
        player2Score
      );
      console.log('✅ Match result updated in database');

      // Update user statistics for both players
      console.log('📊 Starting user statistics update...');
      await this.updateUserStatistics(match, winnerId, player1Score, player2Score);
      console.log('✅ User statistics update completed');

      console.log('✅ Tournament match result saved successfully!');
    } catch (error) {
      console.error('❌ Error saving tournament match result:', error);
    }
  }

  /**
   * Set match status to active
   */
  private async setMatchActive(tournamentId: number, matchId: number) {
    try {
      console.log(`🔄 Setting match ${matchId} to active status`);
      
      // Import DatabaseService dynamically to avoid circular dependency
      const { DatabaseService } = await import('./databaseService.js');
      
      // Update match status to active
      await DatabaseService.run(
        'UPDATE tournament_matches SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['active', matchId]
      );
      
      console.log(`✅ Match ${matchId} set to active status`);
    } catch (error) {
      console.error('❌ Error setting match to active:', error);
    }
  }

  /**
   * Extract user ID from JWT token
   */
  private async extractUserIdFromToken(token: string): Promise<string | null> {
    try {
      // Simple JWT decode without verification (for now)
      // Token format: "header.payload.signature"
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('⚠️ Invalid JWT token format: expected 3 parts, got', parts.length);
        return null;
      }
      
      // JWT uses base64url encoding (not standard base64)
      // Convert base64url to base64 by replacing characters
      let base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      while (base64Payload.length % 4) {
        base64Payload += '=';
      }
      
      try {
        const payload = Buffer.from(base64Payload, 'base64').toString('utf-8');
        const decoded = JSON.parse(payload);
        
        console.log('🔍 Decoded JWT payload:', decoded);
        
        // Try userId first, then id (different JWT implementations use different field names)
        if (decoded && decoded.userId) {
          console.log('✅ Extracted userId from token (userId field):', decoded.userId);
          return decoded.userId.toString();
        } else if (decoded && decoded.id) {
          console.log('✅ Extracted userId from token (id field):', decoded.id);
          return decoded.id.toString();
        } else {
          console.log('⚠️ JWT payload does not contain userId or id. Available fields:', Object.keys(decoded || {}));
        }
      } catch (decodeError) {
        console.error('❌ Error decoding JWT payload:', decodeError);
        // Try standard base64 as fallback
        try {
          const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
          const decoded = JSON.parse(payload);
          if (decoded && decoded.userId) {
            console.log('✅ Extracted userId from token (fallback, userId field):', decoded.userId);
            return decoded.userId.toString();
          } else if (decoded && decoded.id) {
            console.log('✅ Extracted userId from token (fallback, id field):', decoded.id);
            return decoded.id.toString();
          }
        } catch (fallbackError) {
          console.error('❌ Fallback decode also failed:', fallbackError);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error extracting user ID from token:', error);
      return null;
    }
  }

  /**
   * Update user statistics for regular multiplayer games
   */
  private async updateRegularMultiplayerStatistics(roomId: string, gameData: any, winner: string) {
    try {
      console.log('🎮 Updating regular multiplayer statistics for room:', roomId);
      
      // Get the room to find connected players
      const room = this.gameRooms.get(roomId);
      if (!room || !room.players || room.players.size < 2) {
        console.log('⚠️ Room not found or insufficient players for statistics update');
        return;
      }

      const players = Array.from(room.players.values());
      if (players.length < 2) {
        console.log('⚠️ Not enough players for statistics update');
        return;
      }

      // Import services dynamically to avoid circular dependency
      const { UserService } = await import('./userService.js');
      const { DatabaseService } = await import('./databaseService.js');
      
      // Determine winner and loser based on game result
      const leftPlayer = players.find(p => p.side === 'left');
      const rightPlayer = players.find(p => p.side === 'right');
      
      if (!leftPlayer || !rightPlayer) {
        console.log('⚠️ Could not find left or right player for statistics update');
        console.log('Available players:', players.map(p => ({ side: p.side, userId: p.userId })));
        return;
      }

      // Update statistics for both players
      const leftPlayerWon = winner === 'left';
      const rightPlayerWon = winner === 'right';
      
      // Get real user IDs from mapping
      const realLeftUserId = this.playerIdMapping.get(leftPlayer.userId) || leftPlayer.userId;
      const realRightUserId = this.playerIdMapping.get(rightPlayer.userId) || rightPlayer.userId;
      
      console.log(`🔍 Player ID mappings: Left ${leftPlayer.userId} -> ${realLeftUserId}, Right ${rightPlayer.userId} -> ${realRightUserId}`);
      
      // Update left player statistics
      if (leftPlayer.userId && !leftPlayer.userId.startsWith('guest_')) {
        await UserService.updateUserStatistics(
          realLeftUserId,
          gameData.leftScore,
          leftPlayerWon
        );
        console.log(`📊 Updated stats for left player ${realLeftUserId}: Score ${gameData.leftScore}, Won: ${leftPlayerWon}`);
      } else {
        console.log('⚠️ Left player is guest, skipping statistics update');
      }

      // Update right player statistics
      if (rightPlayer.userId && !rightPlayer.userId.startsWith('guest_')) {
        await UserService.updateUserStatistics(
          realRightUserId,
          gameData.rightScore,
          rightPlayerWon
        );
        console.log(`📊 Updated stats for right player ${realRightUserId}: Score ${gameData.rightScore}, Won: ${rightPlayerWon}`);
      } else {
        console.log('⚠️ Right player is guest, skipping statistics update');
      }

      // Save match history for both players (only if they are real users, not guests)
      console.log('📝 Saving match history...');
      
      // Save match history for left player
      if (leftPlayer.userId && !leftPlayer.userId.startsWith('guest_')) {
        try {
          const leftUserIdInt = parseInt(realLeftUserId);
          const rightUserIdInt = rightPlayer.userId.startsWith('guest_') ? null : parseInt(realRightUserId);
          
          // Get opponent username
          let opponentName = rightPlayer.userId;
          if (!rightPlayer.userId.startsWith('guest_') && rightUserIdInt) {
            try {
              const opponentUser = await DatabaseService.query(
                'SELECT username FROM users WHERE id = $1',
                [rightUserIdInt]
              );
              if (opponentUser && opponentUser.length > 0) {
                opponentName = opponentUser[0].username;
              }
            } catch (err) {
              console.error('Error fetching opponent username:', err);
            }
          }
          
          await DatabaseService.run(
            `INSERT INTO match_history (user_id, opponent_id, opponent_name, user_score, opponent_score, result, game_mode, played_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
              leftUserIdInt,
              rightUserIdInt,
              opponentName,
              gameData.leftScore,
              gameData.rightScore,
              leftPlayerWon ? 'win' : 'loss',
              'multiplayer'
            ]
          );
          console.log(`✅ Saved match history for left player ${realLeftUserId} vs ${opponentName}`);
        } catch (error) {
          console.error(`❌ Error saving match history for left player:`, error);
        }
      }
      
      // Save match history for right player
      if (rightPlayer.userId && !rightPlayer.userId.startsWith('guest_')) {
        try {
          const rightUserIdInt = parseInt(realRightUserId);
          const leftUserIdInt = leftPlayer.userId.startsWith('guest_') ? null : parseInt(realLeftUserId);
          
          // Get opponent username
          let opponentName = leftPlayer.userId;
          if (!leftPlayer.userId.startsWith('guest_') && leftUserIdInt) {
            try {
              const opponentUser = await DatabaseService.query(
                'SELECT username FROM users WHERE id = $1',
                [leftUserIdInt]
              );
              if (opponentUser && opponentUser.length > 0) {
                opponentName = opponentUser[0].username;
              }
            } catch (err) {
              console.error('Error fetching opponent username:', err);
            }
          }
          
          await DatabaseService.run(
            `INSERT INTO match_history (user_id, opponent_id, opponent_name, user_score, opponent_score, result, game_mode, played_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
              rightUserIdInt,
              leftUserIdInt,
              opponentName,
              gameData.rightScore,
              gameData.leftScore,
              rightPlayerWon ? 'win' : 'loss',
              'multiplayer'
            ]
          );
          console.log(`✅ Saved match history for right player ${realRightUserId} vs ${opponentName}`);
        } catch (error) {
          console.error(`❌ Error saving match history for right player:`, error);
        }
      }

      console.log('✅ Regular multiplayer statistics and match history updated successfully!');
    } catch (error) {
      console.error('❌ Error updating regular multiplayer statistics:', error);
    }
  }

  /**
   * Update user statistics for tournament match
   */
  private async updateUserStatistics(match: any, winnerId: number, player1Score: number, player2Score: number) {
    try {
      console.log('📊 updateUserStatistics called with:', { 
        matchId: match.id,
        player1_id: match.player1_id, 
        player2_id: match.player2_id,
        winnerId, 
        player1Score, 
        player2Score 
      });
      
      // Import UserService dynamically to avoid circular dependency
      const { UserService } = await import('./userService.js');
      
      // Get participant details to find user IDs
      const { TournamentService } = await import('./tournamentService.js');
      
      // Get participant details
      console.log('🔍 Fetching participant 1 (ID:', match.player1_id, ')');
      const participant1 = await TournamentService.getParticipant(match.player1_id);
      console.log('🔍 Participant 1:', participant1);
      
      console.log('🔍 Fetching participant 2 (ID:', match.player2_id, ')');
      const participant2 = await TournamentService.getParticipant(match.player2_id);
      console.log('🔍 Participant 2:', participant2);
      
      if (!participant1 || !participant2) {
        console.log('⚠️ Could not find participants for statistics update');
        console.log('⚠️ participant1:', participant1);
        console.log('⚠️ participant2:', participant2);
        return;
      }

      // Update statistics for player 1
      console.log('📊 Checking participant1.user_id:', participant1.user_id);
      if (participant1.user_id) {
        const player1Won = match.player1_id === winnerId;
        console.log(`📊 Updating stats for user ${participant1.user_id}: Score ${player1Score}, Won: ${player1Won}`);
        await UserService.updateUserStatistics(
          participant1.user_id.toString(),
          player1Score,
          player1Won
        );
        console.log(`✅ Updated stats for user ${participant1.user_id}`);
      } else {
        console.log('⚠️ participant1 has no user_id, skipping');
      }

      // Update statistics for player 2
      console.log('📊 Checking participant2.user_id:', participant2.user_id);
      if (participant2.user_id) {
        const player2Won = match.player2_id === winnerId;
        console.log(`📊 Updating stats for user ${participant2.user_id}: Score ${player2Score}, Won: ${player2Won}`);
        await UserService.updateUserStatistics(
          participant2.user_id.toString(),
          player2Score,
          player2Won
        );
        console.log(`✅ Updated stats for user ${participant2.user_id}`);
      } else {
        console.log('⚠️ participant2 has no user_id, skipping');
      }

      console.log('✅ User statistics updated successfully!');
    } catch (error) {
      console.error('❌ Error updating user statistics:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
  }

  /**
   * Handle start game request
   */
  private handleStartGame(socket: any, tournamentId: number, matchId: number) {
    const roomId = `tournament-${tournamentId}-match-${matchId}`;
    const room = this.gameRooms.get(roomId);
    
    if (!room) {
      console.error(`❌ Room ${roomId} not found`);
      return;
    }

    // Find the user ID for this socket
    let userId: string | undefined;
    for (const [uid, roomId] of this.playerRooms.entries()) {
      if (roomId === room.id) {
        const playerSocket = room.players.get(uid);
        if (playerSocket === socket) {
          userId = uid;
          break;
        }
      }
    }

    if (!userId) {
      console.error('❌ User ID not found for socket');
      return;
    }

    console.log(`🎮 Player ${userId} requested to start game in room ${roomId}`);
    
    // Set player as ready
    this.setPlayerReady(userId, true);
  }

  /**
   * Handle pause game request
   */
  private handlePauseGame(socket: any, tournamentId: number, matchId: number) {
    const roomId = `tournament-${tournamentId}-match-${matchId}`;
    const room = this.gameRooms.get(roomId);
    
    if (!room) {
      console.error(`❌ Cannot pause game: Room ${roomId} not found`);
      return;
    }

    // Toggle pause/resume
    if (room.gameState.status === 'playing') {
      room.gameState.status = 'paused';
      console.log(`⏸️ Game paused in room ${roomId}`);
      
      this.broadcastToRoom(roomId, 'game_pause', {
        roomState: room.gameState,
        message: 'Game paused'
      });
    } else if (room.gameState.status === 'paused') {
      room.gameState.status = 'playing';
      console.log(`▶️ Game resumed in room ${roomId}`);
      
      this.broadcastToRoom(roomId, 'game_start', {
        roomState: room.gameState,
        message: 'Game resumed'
      });
    } else {
      console.error(`❌ Cannot pause/resume game: Room ${roomId} status is ${room.gameState.status}`);
    }
  }

  /**
   * Handle reset game request
   */
  private handleResetGame(socket: any, tournamentId: number, matchId: number) {
    const roomId = `tournament-${tournamentId}-match-${matchId}`;
    const room = this.gameRooms.get(roomId);
    
    if (!room) {
      console.error(`❌ Room ${roomId} not found`);
      return;
    }

    // Stop current game loop
    const gameLoop = this.gameLoops.get(roomId);
    if (gameLoop) {
      clearInterval(gameLoop);
      this.gameLoops.delete(roomId);
    }

    // Reset game state but keep players connected
    room.gameState.status = 'waiting';
    room.gameState.player1Ready = false;
    room.gameState.player2Ready = false;
    room.gameState.gameData = undefined;
    
    console.log(`🔄 Game reset in room ${roomId}`);
    
    this.broadcastToRoom(roomId, 'game_reset', {
      roomState: room.gameState,
      message: 'Game reset - ready for new game'
    });

    // Auto-restart game since both players are still connected
    setTimeout(() => {
      if (room.gameState.player1Id && room.gameState.player2Id) {
        console.log(`🔄 Auto-restarting game in room ${roomId}`);
        room.gameState.status = 'ready';
        room.gameState.player1Ready = true;
        room.gameState.player2Ready = true;
        
        this.broadcastToRoom(roomId, 'game_start', {
          roomState: room.gameState,
          message: 'Game restarted! Starting new game...'
        });

        // Set game status to playing after a short delay
        setTimeout(() => {
          room.gameState.status = 'playing';
          
          // Initialize fresh game data
          const initialGameData = {
            leftPaddle: { y: 200 },
            rightPaddle: { y: 200 },
            ball: { x: 400, y: 200, dx: 5, dy: 3 },
            leftScore: 0,
            rightScore: 0
          };
          
          room.gameState.gameData = initialGameData;
          
          console.log(`Broadcasting game_playing after reset to room ${roomId} with ${room.players.size} players`);
          this.broadcastToRoom(roomId, 'game_playing', {
            roomState: room.gameState,
            gameState: initialGameData,
            message: 'New game is now playing!'
          });
          
          // Start new game loop
          this.startGameLoop(roomId);
        }, 2000);
      }
    }, 1000);
  }

  /**
   * Handle paddle movement
   */
  private handlePaddleMovement(userId: string, direction: number) {
    const roomId = this.playerRooms.get(userId);
    if (!roomId) {
      console.error(`❌ User ${userId} not in any room`);
      return;
    }

    const room = this.gameRooms.get(roomId);
    if (!room || room.gameState.status !== 'playing') {
      return;
    }

    // Update paddle position in game state
    if (!room.gameState.gameData) {
      console.error(`❌ No game data found for room ${roomId}`);
      return;
    }

    const gameData = room.gameState.gameData;
    const paddleSpeed = 10;
    const paddleHeight = 80;
    const canvasHeight = 400;

    // Find the player's assigned side from the room's player data
    const playerInfo = room.players.get(userId);
    if (!playerInfo) {
      console.error(`❌ Player ${userId} not found in room ${roomId}`);
      return;
    }

    const playerSide = playerInfo.side;
    console.log(`🎮 Paddle movement: User ${userId} (side: ${playerSide}), direction ${direction}`);

    // Determine which paddle to move based on player's assigned SIDE (not player1/player2)
    if (playerSide === 'left') {
      // Player controls left paddle
      gameData.leftPaddle.y += direction * paddleSpeed;
      gameData.leftPaddle.y = Math.max(0, Math.min(canvasHeight - paddleHeight, gameData.leftPaddle.y));
      console.log(`   Left paddle moved to: ${gameData.leftPaddle.y}`);
    } else if (playerSide === 'right') {
      // Player controls right paddle
      gameData.rightPaddle.y += direction * paddleSpeed;
      gameData.rightPaddle.y = Math.max(0, Math.min(canvasHeight - paddleHeight, gameData.rightPaddle.y));
      console.log(`   Right paddle moved to: ${gameData.rightPaddle.y}`);
    } else {
      console.error(`❌ Invalid player side: ${playerSide} for user ${userId}`);
      return;
    }

    // Broadcast updated game state to all players
    this.broadcastToRoom(roomId, 'game_state_update', {
      gameState: gameData,
      fromPlayer: userId
    });
  }

  /**
   * Clear all tournament game rooms and player mappings
   * This is used when cleaning up tournament data
   */
  clearAllGameRooms(): void {
    console.log('Clearing all game rooms...');
    console.log(`Clearing ${this.gameRooms.size} game rooms and ${this.playerRooms.size} player mappings`);
    
    // Stop all game loops
    for (const [roomId, gameLoop] of this.gameLoops) {
      clearInterval(gameLoop);
    }
    this.gameLoops.clear();
    
    // Clear all game rooms
    this.gameRooms.clear();
    
    // Clear all player room mappings
    this.playerRooms.clear();
    
    console.log('✅ All game rooms cleared successfully');
  }
}

export default SocketIOService;
