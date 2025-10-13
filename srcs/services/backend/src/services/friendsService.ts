/**
 * Friends Service
 * 
 * Handles friend requests, friend lists, and user blocking functionality.
 */

import { DatabaseService } from './databaseService';

export interface Friend {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  onlineStatus: string;
  lastSeen?: string;
}

export interface FriendRequest {
  id: string;
  userId: string;
  friendId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export class FriendsService {
  /**
   * Send friend request
   */
  static async sendFriendRequest(userId: string, friendUsername: string): Promise<void> {
    // Find friend by username
    const friendResult = await DatabaseService.query(
      'SELECT id FROM users WHERE username = ? AND is_active = true',
      [friendUsername]
    );

    if (friendResult.length === 0) {
      throw new Error('User not found');
    }

    const friendId = friendResult[0].id;

    // Check if already friends or request exists
    const existingRequest = await DatabaseService.query(
      'SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );

    if (existingRequest.length > 0) {
      throw new Error('Friend request already exists or already friends');
    }

    // Check if blocked
    const blocked = await DatabaseService.query(
      'SELECT id FROM blocked_users WHERE (user_id = ? AND blocked_user_id = ?) OR (user_id = ? AND blocked_user_id = ?)',
      [userId, friendId, friendId, userId]
    );

    if (blocked.length > 0) {
      throw new Error('Cannot send friend request to blocked user');
    }

    // Create friend request
    await DatabaseService.run(
      'INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
      [userId, friendId, 'pending']
    );
  }

  /**
   * Accept friend request
   */
  static async acceptFriendRequest(userId: string, requestId: string): Promise<void> {
    const result = await DatabaseService.run(
      `UPDATE friends 
       SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND friend_id = ? AND status = 'pending'`,
      [requestId, userId]
    );

    if (result.changes === 0) {
      throw new Error('Friend request not found or already processed');
    }
  }

  /**
   * Reject friend request
   */
  static async rejectFriendRequest(userId: string, requestId: string): Promise<void> {
    const result = await DatabaseService.run(
      'DELETE FROM friends WHERE id = ? AND friend_id = ? AND status = ?',
      [requestId, userId, 'pending']
    );

    if (result.changes === 0) {
      throw new Error('Friend request not found');
    }
  }

  /**
   * Remove friend
   */
  static async removeFriend(userId: string, friendId: string): Promise<void> {
    const result = await DatabaseService.run(
      'DELETE FROM friends WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = ?',
      [userId, friendId, friendId, userId, 'accepted']
    );

    if (result.changes === 0) {
      throw new Error('Friend relationship not found');
    }
  }

  /**
   * Get friend list
   */
  static async getFriends(userId: string): Promise<Friend[]> {
    const result = await DatabaseService.query(
      `SELECT 
        u.id, u.username, u.display_name, u.avatar_url, u.online_status, u.last_seen
       FROM friends f
       JOIN users u ON (
         CASE 
           WHEN f.user_id = ? THEN u.id = f.friend_id
           ELSE u.id = f.user_id
         END
       )
       WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted' AND u.is_active = true
       ORDER BY u.online_status DESC, u.username ASC`,
      [userId, userId, userId]
    );

    return result.map((row: any) => ({
      id: row.id.toString(),
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      onlineStatus: row.online_status || 'offline',
      lastSeen: row.last_seen
    }));
  }

  /**
   * Get pending friend requests (received)
   */
  static async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const result = await DatabaseService.query(
      `SELECT 
        f.id, f.user_id, f.friend_id, f.created_at, f.status,
        u.username, u.display_name, u.avatar_url
       FROM friends f
       JOIN users u ON u.id = f.user_id
       WHERE f.friend_id = ? AND f.status = 'pending' AND u.is_active = true
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return result.map((row: any) => ({
      id: row.id.toString(),
      userId: row.user_id.toString(),
      friendId: row.friend_id.toString(),
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      status: row.status,
      createdAt: row.created_at
    }));
  }

  /**
   * Get sent friend requests
   */
  static async getSentRequests(userId: string): Promise<FriendRequest[]> {
    const result = await DatabaseService.query(
      `SELECT 
        f.id, f.user_id, f.friend_id, f.created_at, f.status,
        u.username, u.display_name, u.avatar_url
       FROM friends f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = ? AND f.status = 'pending' AND u.is_active = true
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return result.map((row: any) => ({
      id: row.id.toString(),
      userId: row.user_id.toString(),
      friendId: row.friend_id.toString(),
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      status: row.status,
      createdAt: row.created_at
    }));
  }

  /**
   * Block user
   */
  static async blockUser(userId: string, blockedUsername: string, reason?: string): Promise<void> {
    // Find user to block
    const userResult = await DatabaseService.query(
      'SELECT id FROM users WHERE username = ? AND is_active = true',
      [blockedUsername]
    );

    if (userResult.length === 0) {
      throw new Error('User not found');
    }

    const blockedUserId = userResult[0].id;

    // Check if already blocked
    const existing = await DatabaseService.query(
      'SELECT id FROM blocked_users WHERE user_id = ? AND blocked_user_id = ?',
      [userId, blockedUserId]
    );

    if (existing.length > 0) {
      throw new Error('User already blocked');
    }

    // Remove friend relationship if exists
    await DatabaseService.run(
      'DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, blockedUserId, blockedUserId, userId]
    );

    // Block user
    await DatabaseService.run(
      'INSERT INTO blocked_users (user_id, blocked_user_id, reason) VALUES (?, ?, ?)',
      [userId, blockedUserId, reason]
    );
  }

  /**
   * Unblock user
   */
  static async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    const result = await DatabaseService.run(
      'DELETE FROM blocked_users WHERE user_id = ? AND blocked_user_id = ?',
      [userId, blockedUserId]
    );

    if (result.changes === 0) {
      throw new Error('User not blocked');
    }
  }

  /**
   * Get blocked users list
   */
  static async getBlockedUsers(userId: string): Promise<Friend[]> {
    const result = await DatabaseService.query(
      `SELECT 
        u.id, u.username, u.display_name, u.avatar_url, b.created_at, b.reason
       FROM blocked_users b
       JOIN users u ON u.id = b.blocked_user_id
       WHERE b.user_id = ? AND u.is_active = true
       ORDER BY b.created_at DESC`,
      [userId]
    );

    return result.map((row: any) => ({
      id: row.id.toString(),
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      onlineStatus: 'blocked',
      lastSeen: row.created_at
    }));
  }

  /**
   * Check if user is blocked
   */
  static async isBlocked(userId: string, otherUserId: string): Promise<boolean> {
    const result = await DatabaseService.query(
      'SELECT id FROM blocked_users WHERE (user_id = ? AND blocked_user_id = ?) OR (user_id = ? AND blocked_user_id = ?)',
      [userId, otherUserId, otherUserId, userId]
    );

    return result.length > 0;
  }

  /**
   * Update user online status
   */
  static async updateOnlineStatus(userId: string, status: 'online' | 'offline' | 'in_game'): Promise<void> {
    await DatabaseService.run(
      'UPDATE users SET online_status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [status, userId]
    );
  }
}

