/**
 * WebSocket Routes for Real-time Game Synchronization
 */

import { FastifyInstance } from 'fastify';
import WebSocketService from '../services/websocketService';

export async function websocketRoutes(fastify: FastifyInstance) {
  const wsService = new WebSocketService(fastify);

  // WebSocket connection for game rooms
  fastify.register(async function (fastify) {
    fastify.get('/ws/game/:tournamentId/:matchId', { websocket: true }, (connection, req) => {
      const { tournamentId, matchId } = req.params as { tournamentId: string, matchId: string };
      
      console.log(`WebSocket connection attempt for tournament ${tournamentId}, match ${matchId}`);
      
      // Extract user ID from query parameters (in real implementation, use JWT)
      const userId = (req.query as any)?.userId as string;
      if (!userId) {
        connection.socket.close(1008, 'User ID required');
        return;
      }

      console.log(`WebSocket connection established for user ${userId}`);

      // Handle incoming messages
      connection.socket.on('message', (message: any) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`Received message from user ${userId}:`, data);

          switch (data.type) {
            case 'join_room':
              wsService.joinGameRoom(connection.socket, userId, parseInt(tournamentId), parseInt(matchId));
              break;
              
            case 'leave_room':
              wsService.leaveGameRoom(userId);
              break;
              
            case 'player_ready':
              wsService.setPlayerReady(userId, data.ready);
              break;
              
            case 'game_state_update':
              wsService.updateGameState(userId, data.gameState);
              break;
              
            case 'game_end':
              wsService.endGame(userId, data.gameResult);
              break;
              
            default:
              console.log(`Unknown message type: ${data.type}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle connection close
      connection.socket.on('close', () => {
        console.log(`WebSocket connection closed for user ${userId}`);
        wsService.leaveGameRoom(userId);
      });

      // Handle connection error
      connection.socket.on('error', (error: any) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        wsService.leaveGameRoom(userId);
      });

      // Send welcome message
      connection.socket.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to game room',
        tournamentId: parseInt(tournamentId),
        matchId: parseInt(matchId)
      }));
    });
  });
}
