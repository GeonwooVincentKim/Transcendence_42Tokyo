/**
 * Chat Routes
 * 
 * REST API endpoints for chat channels, direct messages, and game invitations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from '../services/chatService';

/**
 * Chat routes plugin
 */
export async function chatRoutes(server: FastifyInstance) {
  
  /**
   * Create a new channel
   */
  server.post('/api/chat/channels', async (request: FastifyRequest<{
    Body: {
      name: string;
      type: 'public' | 'private' | 'protected';
      description?: string;
      password?: string;
    }
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).id;
      const { name, type, description, password } = request.body;

      const channel = await ChatService.createChannel(userId, name, type, description, password);
      
      return reply.status(201).send({ channel });
    } catch (error: any) {
      server.log.error('Failed to create channel:', error);
      return reply.status(400).send({ error: error.message || 'Failed to create channel' });
    }
  });

  /**
   * Get user's channels
   */
  server.get('/api/chat/channels', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).id;

      const channels = await ChatService.getUserChannels(userId);
      
      return reply.status(200).send({ channels });
    } catch (error) {
      server.log.error('Failed to get channels:', error);
      return reply.status(500).send({ error: 'Failed to get channels' });
    }
  });

  /**
   * Get public channels
   */
  server.get('/api/chat/channels/public', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const channels = await ChatService.getPublicChannels();
      
      return reply.status(200).send({ channels });
    } catch (error) {
      server.log.error('Failed to get public channels:', error);
      return reply.status(500).send({ error: 'Failed to get public channels' });
    }
  });

  /**
   * Join a channel
   */
  server.post('/api/chat/channels/:channelId/join', async (request: FastifyRequest<{
    Params: { channelId: string };
    Body: { password?: string };
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).id;
      const { channelId } = request.params;
      const { password } = request.body;

      await ChatService.joinChannel(userId, channelId, password);
      
      return reply.status(200).send({ success: true, message: 'Joined channel successfully' });
    } catch (error: any) {
      server.log.error('Failed to join channel:', error);
      return reply.status(400).send({ error: error.message || 'Failed to join channel' });
    }
  });

  /**
   * Leave a channel
   */
  server.post('/api/chat/channels/:channelId/leave', async (request: FastifyRequest<{
    Params: { channelId: string }
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).id;
      const { channelId } = request.params;

      await ChatService.leaveChannel(userId, channelId);
      
      return reply.status(200).send({ success: true, message: 'Left channel successfully' });
    } catch (error: any) {
      server.log.error('Failed to leave channel:', error);
      return reply.status(400).send({ error: error.message || 'Failed to leave channel' });
    }
  });

  /**
   * Send channel message
   */
  server.post('/api/chat/channels/:channelId/messages', async (request: FastifyRequest<{
    Params: { channelId: string };
    Body: { message: string };
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).id;
      const { channelId } = request.params;
      const { message } = request.body;

      const msg = await ChatService.sendChannelMessage(userId, channelId, message);
      
      return reply.status(201).send({ message: msg });
    } catch (error: any) {
      server.log.error('Failed to send message:', error);
      return reply.status(400).send({ error: error.message || 'Failed to send message' });
    }
  });

  /**
   * Get channel messages
   */
  server.get('/api/chat/channels/:channelId/messages', async (request: FastifyRequest<{
    Params: { channelId: string };
    Querystring: { limit?: string };
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const { channelId } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit) : 50;

      const messages = await ChatService.getChannelMessages(channelId, limit);
      
      return reply.status(200).send({ messages });
    } catch (error) {
      server.log.error('Failed to get messages:', error);
      return reply.status(500).send({ error: 'Failed to get messages' });
    }
  });

  /**
   * Send direct message
   */
  server.post('/api/chat/direct/:userId', async (request: FastifyRequest<{
    Params: { userId: string };
    Body: { message: string };
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const senderId = (request.user as any).id;
      const { userId: receiverId } = request.params;
      const { message } = request.body;

      const msg = await ChatService.sendDirectMessage(senderId, receiverId, message);
      
      return reply.status(201).send({ message: msg });
    } catch (error: any) {
      server.log.error('Failed to send direct message:', error);
      return reply.status(400).send({ error: error.message || 'Failed to send direct message' });
    }
  });

  /**
   * Get direct messages
   */
  server.get('/api/chat/direct/:userId', async (request: FastifyRequest<{
    Params: { userId: string };
    Querystring: { limit?: string };
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId1 = (request.user as any).id;
      const { userId: userId2 } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit) : 50;

      const messages = await ChatService.getDirectMessages(userId1, userId2, limit);
      
      return reply.status(200).send({ messages });
    } catch (error) {
      server.log.error('Failed to get direct messages:', error);
      return reply.status(500).send({ error: 'Failed to get direct messages' });
    }
  });

  /**
   * Mark message as read
   */
  server.post('/api/chat/messages/:messageId/read', async (request: FastifyRequest<{
    Params: { messageId: string }
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).id;
      const { messageId } = request.params;

      await ChatService.markAsRead(userId, messageId);
      
      return reply.status(200).send({ success: true });
    } catch (error) {
      server.log.error('Failed to mark as read:', error);
      return reply.status(500).send({ error: 'Failed to mark as read' });
    }
  });

  /**
   * Send game invitation
   */
  server.post('/api/chat/invite/:userId', async (request: FastifyRequest<{
    Params: { userId: string };
    Body: { gameType?: string };
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const senderId = (request.user as any).id;
      const { userId: receiverId } = request.params;
      const { gameType } = request.body;

      await ChatService.sendGameInvitation(senderId, receiverId, gameType);
      
      return reply.status(201).send({ success: true, message: 'Invitation sent' });
    } catch (error) {
      server.log.error('Failed to send invitation:', error);
      return reply.status(500).send({ error: 'Failed to send invitation' });
    }
  });

  /**
   * Respond to game invitation
   */
  server.post('/api/chat/invitations/:invitationId/respond', async (request: FastifyRequest<{
    Params: { invitationId: string };
    Body: { accept: boolean };
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).id;
      const { invitationId } = request.params;
      const { accept } = request.body;

      await ChatService.respondToInvitation(userId, invitationId, accept);
      
      return reply.status(200).send({ success: true, message: accept ? 'Invitation accepted' : 'Invitation rejected' });
    } catch (error: any) {
      server.log.error('Failed to respond to invitation:', error);
      return reply.status(400).send({ error: error.message || 'Failed to respond to invitation' });
    }
  });

  /**
   * Get pending invitations
   */
  server.get('/api/chat/invitations', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).id;

      const invitations = await ChatService.getPendingInvitations(userId);
      
      return reply.status(200).send({ invitations });
    } catch (error) {
      server.log.error('Failed to get invitations:', error);
      return reply.status(500).send({ error: 'Failed to get invitations' });
    }
  });
}

