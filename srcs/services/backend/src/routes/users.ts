/**
 * User Routes
 * 
 * REST API endpoints for user profile management, friends, and social features
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/userService';
import { FriendsService } from '../services/friendsService';
import { DatabaseService } from '../services/databaseService';
import multipart from '@fastify/multipart';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

/**
 * User routes plugin
 */
export async function userRoutes(server: FastifyInstance) {
  // Register multipart for file uploads
  server.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    }
  });

  /**
   * Get user profile (public)
   */
  server.get('/api/users/:username', async (request: FastifyRequest<{
    Params: { username: string }
  }>, reply: FastifyReply) => {
    try {
      const { username } = request.params;

      const userResult = await DatabaseService.query(
        `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.online_status, u.created_at,
                us.total_games, us.games_won, us.games_lost, us.highest_score
         FROM users u
         LEFT JOIN user_statistics us ON us.user_id = u.id
         WHERE u.username = $1 AND u.is_active = true`,
        [username]
      );

      if (userResult.length === 0) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const user = userResult[0];
      
      return {
        id: user.id.toString(),
        username: user.username,
        displayName: user.display_name || user.username,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        onlineStatus: user.online_status || 'offline',
        createdAt: user.created_at,
        stats: {
          totalGames: parseInt(user.total_games) || 0,
          gamesWon: parseInt(user.games_won) || 0,
          gamesLost: parseInt(user.games_lost) || 0,
          highestScore: parseInt(user.highest_score) || 0
        }
      };
    } catch (error) {
      server.log.error('Failed to get user profile:', error);
      return reply.status(500).send({ error: 'Failed to get user profile' });
    }
  });

  /**
   * Update user profile (authenticated)
   */
  server.put('/api/users/profile', async (request: FastifyRequest<{
    Body: {
      displayName?: string;
      bio?: string;
    }
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }
      
      const { displayName, bio } = request.body;

      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (displayName !== undefined) {
        updates.push(`display_name = $${paramCount++}`);
        params.push(displayName);
      }

      if (bio !== undefined) {
        updates.push(`bio = $${paramCount++}`);
        params.push(bio);
      }

      if (updates.length === 0) {
        return reply.status(400).send({ error: 'No fields to update' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(userId);

      await DatabaseService.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        params
      );

      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      server.log.error('Failed to update profile:', error);
      return reply.status(500).send({ error: 'Failed to update profile' });
    }
  });

  /**
   * Upload avatar
   */
  server.post('/api/users/avatar', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;

      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Only images allowed.' });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const ext = path.extname(data.filename);
      const filename = `${userId}_${Date.now()}${ext}`;
      const filepath = path.join(uploadsDir, filename);

      // Save file
      await pipeline(data.file, fs.createWriteStream(filepath));

      // Update user avatar URL
      const avatarUrl = `/uploads/avatars/${filename}`;
      await DatabaseService.run(
        'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [avatarUrl, userId]
      );

      return { success: true, avatarUrl };
    } catch (error) {
      server.log.error('Failed to upload avatar:', error);
      return reply.status(500).send({ error: 'Failed to upload avatar' });
    }
  });

  /**
   * Get match history
   */
  server.get('/api/users/match-history', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;

      const matches = await DatabaseService.query(
        `SELECT 
          mh.id, mh.opponent_name, mh.user_score, mh.opponent_score, 
          mh.result, mh.game_mode, mh.duration, mh.played_at,
          u.username as opponent_username, u.avatar_url as opponent_avatar
         FROM match_history mh
         LEFT JOIN users u ON u.id = mh.opponent_id
         WHERE mh.user_id = $1
         ORDER BY mh.played_at DESC
         LIMIT 50`,
        [userId]
      );

      return matches.map((match: any) => ({
        id: match.id.toString(),
        opponentName: match.opponent_name || match.opponent_username || 'Unknown',
        opponentAvatar: match.opponent_avatar,
        userScore: match.user_score,
        opponentScore: match.opponent_score,
        result: match.result,
        gameMode: match.game_mode,
        duration: match.duration,
        playedAt: match.played_at
      }));
    } catch (error) {
      server.log.error('Failed to get match history:', error);
      return reply.status(500).send({ error: 'Failed to get match history' });
    }
  });

  /**
   * Friends endpoints
   */

  // Get friends list
  server.get('/api/users/friends', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;

      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }

      const friends = await FriendsService.getFriends(userId);
      return { friends };
    } catch (error) {
      server.log.error('Failed to get friends:', error);
      return reply.status(500).send({ error: 'Failed to get friends' });
    }
  });

  // Send friend request
  server.post('/api/users/friends/request', async (request: FastifyRequest<{
    Body: { username: string }
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      const { username } = request.body;

      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }

      await FriendsService.sendFriendRequest(userId, username);
      return { success: true, message: 'Friend request sent' };
    } catch (error: any) {
      server.log.error('Failed to send friend request:', error);
      return reply.status(400).send({ error: error.message || 'Failed to send friend request' });
    }
  });

  // Get pending friend requests
  server.get('/api/users/friends/requests', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;

      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }

      const requests = await FriendsService.getPendingRequests(userId);
      return { requests };
    } catch (error) {
      server.log.error('Failed to get friend requests:', error);
      return reply.status(500).send({ error: 'Failed to get friend requests' });
    }
  });

  // Accept friend request
  server.post('/api/users/friends/accept/:requestId', async (request: FastifyRequest<{
    Params: { requestId: string }
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      const { requestId } = request.params;

      await FriendsService.acceptFriendRequest(userId, requestId);
      return { success: true, message: 'Friend request accepted' };
    } catch (error: any) {
      server.log.error('Failed to accept friend request:', error);
      return reply.status(400).send({ error: error.message || 'Failed to accept friend request' });
    }
  });

  // Reject friend request
  server.post('/api/users/friends/reject/:requestId', async (request: FastifyRequest<{
    Params: { requestId: string }
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      const { requestId } = request.params;

      await FriendsService.rejectFriendRequest(userId, requestId);
      return { success: true, message: 'Friend request rejected' };
    } catch (error: any) {
      server.log.error('Failed to reject friend request:', error);
      return reply.status(400).send({ error: error.message || 'Failed to reject friend request' });
    }
  });

  // Remove friend
  server.delete('/api/users/friends/:friendId', async (request: FastifyRequest<{
    Params: { friendId: string }
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      const { friendId } = request.params;

      await FriendsService.removeFriend(userId, friendId);
      return { success: true, message: 'Friend removed' };
    } catch (error: any) {
      server.log.error('Failed to remove friend:', error);
      return reply.status(400).send({ error: error.message || 'Failed to remove friend' });
    }
  });

  /**
   * Block/Unblock endpoints
   */

  // Block user
  server.post('/api/users/block', async (request: FastifyRequest<{
    Body: { username: string; reason?: string }
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      const { username, reason } = request.body;

      await FriendsService.blockUser(userId, username, reason);
      return { success: true, message: 'User blocked' };
    } catch (error: any) {
      server.log.error('Failed to block user:', error);
      return reply.status(400).send({ error: error.message || 'Failed to block user' });
    }
  });

  // Unblock user
  server.delete('/api/users/block/:blockedUserId', async (request: FastifyRequest<{
    Params: { blockedUserId: string }
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      const { blockedUserId } = request.params;

      await FriendsService.unblockUser(userId, blockedUserId);
      return { success: true, message: 'User unblocked' };
    } catch (error: any) {
      server.log.error('Failed to unblock user:', error);
      return reply.status(400).send({ error: error.message || 'Failed to unblock user' });
    }
  });

  // Get blocked users
  server.get('/api/users/blocked', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;

      const blocked = await FriendsService.getBlockedUsers(userId);
      return { blocked };
    } catch (error) {
      server.log.error('Failed to get blocked users:', error);
      return reply.status(500).send({ error: 'Failed to get blocked users' });
    }
  });
}

