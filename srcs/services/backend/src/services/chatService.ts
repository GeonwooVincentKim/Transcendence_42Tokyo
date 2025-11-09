/**
 * Chat Service
 * 
 * Handles chat channels, direct messages, and game invitations
 */

import bcrypt from 'bcryptjs';
import { DatabaseService } from './databaseService';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'protected';
  ownerId: string;
  memberCount?: number;
  createdAt: string;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  message: string;
  createdAt: string;
  editedAt?: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderUsername: string;
  receiverUsername: string;
  message: string;
  createdAt: string;
  readAt?: string;
}

export class ChatService {
  /**
   * Create a new chat channel
   */
  static async createChannel(
    ownerId: string,
    name: string,
    type: 'public' | 'private' | 'protected',
    description?: string,
    password?: string
  ): Promise<Channel> {
    // Check if channel name already exists
    const existing = await DatabaseService.query(
      'SELECT id FROM chat_channels WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      throw new Error('Channel name already exists');
    }

    // Hash password if protected
    let passwordHash = null;
    if (type === 'protected' && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Create channel
    await DatabaseService.run(
      'INSERT INTO chat_channels (name, description, type, password_hash, owner_id) VALUES (?, ?, ?, ?, ?)',
      [name, description, type, passwordHash, ownerId]
    );

    // Get created channel
    const result = await DatabaseService.query(
      'SELECT id, name, description, type, owner_id, created_at FROM chat_channels WHERE name = ?',
      [name]
    );

    const channel = result[0];

    // Add owner as admin member
    await DatabaseService.run(
      'INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)',
      [channel.id, ownerId, 'admin']
    );

    const channelData = {
      id: channel.id.toString(),
      name: channel.name,
      description: channel.description,
      type: channel.type,
      ownerId: channel.owner_id.toString(),
      createdAt: channel.created_at
    };

    // Note: Socket.IO broadcasting will be handled by the route handler
    // This ensures proper separation of concerns

    return channelData;
  }

  /**
   * Check if user is a member of a channel
   */
  static async checkChannelMembership(userId: string, channelId: string): Promise<boolean> {
    const result = await DatabaseService.query(
      'SELECT id FROM channel_members WHERE channel_id = ? AND user_id = ?',
      [channelId, userId]
    );
    return result.length > 0;
  }

  /**
   * Join a channel
   */
  static async joinChannel(userId: string, channelId: string, password?: string): Promise<void> {
    // Get channel info
    const channelResult = await DatabaseService.query(
      'SELECT type, password_hash FROM chat_channels WHERE id = ?',
      [channelId]
    );

    if (channelResult.length === 0) {
      throw new Error('Channel not found');
    }

    const channel = channelResult[0];

    // Check if already a member
    const existing = await DatabaseService.query(
      'SELECT id FROM channel_members WHERE channel_id = ? AND user_id = ?',
      [channelId, userId]
    );

    if (existing.length > 0) {
      throw new Error('Already a member of this channel');
    }

    // Verify password for protected channels
    if (channel.type === 'protected') {
      if (!password || !channel.password_hash) {
        throw new Error('Password required for protected channel');
      }

      const validPassword = await bcrypt.compare(password, channel.password_hash);
      if (!validPassword) {
        throw new Error('Invalid channel password');
      }
    }

    // Add member
    await DatabaseService.run(
      'INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)',
      [channelId, userId, 'member']
    );
  }

  /**
   * Leave a channel
   */
  static async leaveChannel(userId: string, channelId: string): Promise<void> {
    const result = await DatabaseService.run(
      'DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?',
      [channelId, userId]
    );

    if (result.changes === 0) {
      throw new Error('Not a member of this channel');
    }
  }

  /**
   * Get user's channels
   */
  static async getUserChannels(userId: string): Promise<Channel[]> {
    const result = await DatabaseService.query(
      `SELECT 
        c.id, c.name, c.description, c.type, c.owner_id, c.created_at,
        COUNT(cm.id) as member_count
       FROM chat_channels c
       INNER JOIN channel_members cm1 ON c.id = cm1.channel_id AND cm1.user_id = ?
       LEFT JOIN channel_members cm ON c.id = cm.channel_id
       GROUP BY c.id, c.name, c.description, c.type, c.owner_id, c.created_at
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return result.map((row: any) => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      type: row.type,
      ownerId: row.owner_id.toString(),
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at
    }));
  }

  /**
   * Get public channels
   */
  static async getPublicChannels(): Promise<Channel[]> {
    const result = await DatabaseService.query(
      `SELECT 
        c.id, c.name, c.description, c.type, c.owner_id, c.created_at,
        COUNT(cm.id) as member_count
       FROM chat_channels c
       LEFT JOIN channel_members cm ON c.id = cm.channel_id
       WHERE c.type = 'public'
       GROUP BY c.id, c.name, c.description, c.type, c.owner_id, c.created_at
       ORDER BY c.created_at DESC`
    );

    return result.map((row: any) => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      type: row.type,
      ownerId: row.owner_id.toString(),
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at
    }));
  }

  /**
   * Get all channels (public + protected, for discovery)
   */
  static async getAllChannels(): Promise<Channel[]> {
    const result = await DatabaseService.query(
      `SELECT 
        c.id, c.name, c.description, c.type, c.owner_id, c.created_at,
        COUNT(cm.id) as member_count
       FROM chat_channels c
       LEFT JOIN channel_members cm ON c.id = cm.channel_id
       WHERE c.type IN ('public', 'protected')
       GROUP BY c.id, c.name, c.description, c.type, c.owner_id, c.created_at
       ORDER BY c.created_at DESC`
    );

    return result.map((row: any) => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      type: row.type,
      ownerId: row.owner_id.toString(),
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at
    }));
  }

  /**
   * Send channel message
   */
  static async sendChannelMessage(userId: string, channelId: string, message: string): Promise<ChannelMessage> {
    // Check if user is a member
    const memberResult = await DatabaseService.query(
      'SELECT id, muted_until FROM channel_members WHERE channel_id = ? AND user_id = ?',
      [channelId, userId]
    );

    if (memberResult.length === 0) {
      throw new Error('Not a member of this channel');
    }

    const member = memberResult[0];

    // Check if muted
    if (member.muted_until && new Date(member.muted_until) > new Date()) {
      throw new Error('You are muted in this channel');
    }

    // Insert message
    await DatabaseService.run(
      'INSERT INTO channel_messages (channel_id, user_id, message) VALUES (?, ?, ?)',
      [channelId, userId, message]
    );

    // Get message with user info
    const messageResult = await DatabaseService.query(
      `SELECT 
        cm.id, cm.channel_id, cm.user_id, cm.message, cm.created_at, cm.edited_at,
        u.username, u.avatar_url
       FROM channel_messages cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.channel_id = ? AND cm.user_id = ?
       ORDER BY cm.created_at DESC
       LIMIT 1`,
      [channelId, userId]
    );

    const msg = messageResult[0];

    return {
      id: msg.id.toString(),
      channelId: msg.channel_id.toString(),
      userId: msg.user_id.toString(),
      username: msg.username,
      avatarUrl: msg.avatar_url,
      message: msg.message,
      createdAt: msg.created_at,
      editedAt: msg.edited_at
    };
  }

  /**
   * Get channel messages
   */
  static async getChannelMessages(channelId: string, limit: number = 50): Promise<ChannelMessage[]> {
    const result = await DatabaseService.query(
      `SELECT 
        cm.id, cm.channel_id, cm.user_id, cm.message, cm.created_at, cm.edited_at,
        u.username, u.avatar_url
       FROM channel_messages cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.channel_id = ? AND cm.deleted = 0
       ORDER BY cm.created_at DESC
       LIMIT ?`,
      [channelId, limit]
    );

    return result.reverse().map((row: any) => ({
      id: row.id.toString(),
      channelId: row.channel_id.toString(),
      userId: row.user_id.toString(),
      username: row.username,
      avatarUrl: row.avatar_url,
      message: row.message,
      createdAt: row.created_at,
      editedAt: row.edited_at
    }));
  }

  /**
   * Send direct message
   */
  static async sendDirectMessage(senderId: string, receiverId: string, message: string): Promise<DirectMessage> {
    // Check if receiver is blocked
    const blocked = await DatabaseService.query(
      'SELECT id FROM blocked_users WHERE (user_id = ? AND blocked_user_id = ?) OR (user_id = ? AND blocked_user_id = ?)',
      [senderId, receiverId]
    );

    if (blocked.length > 0) {
      throw new Error('Cannot send message to this user');
    }

    // Insert message
    await DatabaseService.run(
      'INSERT INTO direct_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [senderId, receiverId, message]
    );

    // Get message with user info
    const result = await DatabaseService.query(
      `SELECT 
        dm.id, dm.sender_id, dm.receiver_id, dm.message, dm.created_at, dm.read_at,
        u1.username as sender_username,
        u2.username as receiver_username
       FROM direct_messages dm
       JOIN users u1 ON dm.sender_id = u1.id
       JOIN users u2 ON dm.receiver_id = u2.id
       WHERE dm.sender_id = ? AND dm.receiver_id = ?
       ORDER BY dm.created_at DESC
       LIMIT 1`,
      [senderId, receiverId]
    );

    const msg = result[0];

    return {
      id: msg.id.toString(),
      senderId: msg.sender_id.toString(),
      receiverId: msg.receiver_id.toString(),
      senderUsername: msg.sender_username,
      receiverUsername: msg.receiver_username,
      message: msg.message,
      createdAt: msg.created_at,
      readAt: msg.read_at
    };
  }

  /**
   * Get direct messages between two users
   */
  static async getDirectMessages(userId1: string, userId2: string, limit: number = 50): Promise<DirectMessage[]> {
    const result = await DatabaseService.query(
      `SELECT 
        dm.id, dm.sender_id, dm.receiver_id, dm.message, dm.created_at, dm.read_at,
        u1.username as sender_username,
        u2.username as receiver_username
       FROM direct_messages dm
       JOIN users u1 ON dm.sender_id = u1.id
       JOIN users u2 ON dm.receiver_id = u2.id
       WHERE ((dm.sender_id = ? AND dm.receiver_id = ? AND dm.deleted_by_sender = 0) 
              OR (dm.sender_id = ? AND dm.receiver_id = ? AND dm.deleted_by_receiver = 0))
       ORDER BY dm.created_at DESC
       LIMIT ?`,
      [userId1, userId2, limit]
    );

    return result.reverse().map((row: any) => ({
      id: row.id.toString(),
      senderId: row.sender_id.toString(),
      receiverId: row.receiver_id.toString(),
      senderUsername: row.sender_username,
      receiverUsername: row.receiver_username,
      message: row.message,
      createdAt: row.created_at,
      readAt: row.read_at
    }));
  }

  /**
   * Mark direct message as read
   */
  static async markAsRead(userId: string, messageId: string): Promise<void> {
    await DatabaseService.run(
      'UPDATE direct_messages SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND receiver_id = ? AND read_at IS NULL',
      [messageId, userId]
    );
  }

  /**
   * Send game invitation
   */
  static async sendGameInvitation(senderId: string, receiverId: string, gameType?: string): Promise<void> {
    await DatabaseService.run(
      'INSERT INTO game_invitations (sender_id, receiver_id, game_type, status) VALUES (?, ?, ?, ?)',
      [senderId, receiverId, gameType || 'pong', 'pending']
    );
  }

  /**
   * Respond to game invitation
   */
  static async respondToInvitation(userId: string, invitationId: string, accept: boolean): Promise<void> {
    const status = accept ? 'accepted' : 'rejected';
    
    const result = await DatabaseService.run(
      'UPDATE game_invitations SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ? AND receiver_id = ? AND status = ?',
      [status, invitationId, userId, 'pending']
    );

    if (result.changes === 0) {
      throw new Error('Invitation not found or already responded');
    }
  }

  /**
   * Get pending game invitations
   */
  static async getPendingInvitations(userId: string): Promise<any[]> {
    const result = await DatabaseService.query(
      `SELECT 
        gi.id, gi.sender_id, gi.game_type, gi.created_at,
        u.username as sender_username, u.avatar_url as sender_avatar
       FROM game_invitations gi
       JOIN users u ON gi.sender_id = u.id
       WHERE gi.receiver_id = ? AND gi.status = 'pending'
       ORDER BY gi.created_at DESC`,
      [userId]
    );

    return result.map((row: any) => ({
      id: row.id.toString(),
      senderId: row.sender_id.toString(),
      senderUsername: row.sender_username,
      senderAvatar: row.sender_avatar,
      gameType: row.game_type,
      createdAt: row.created_at
    }));
  }
}

