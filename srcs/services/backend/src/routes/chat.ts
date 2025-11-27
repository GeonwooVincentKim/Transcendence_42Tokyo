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
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }
      const { name, type, description, password } = request.body;

      const channel = await ChatService.createChannel(userId, name, type, description, password);
      
      // Broadcast channel creation to all connected users
      try {
        // Get SocketIOService instance from global scope
        const socketIOService = (global as any).socketIOService;
        if (socketIOService && socketIOService.getIO) {
          const io = socketIOService.getIO();
          io.emit('channel_created', { channel });
          console.log('Broadcasted channel creation:', channel);
        } else {
          console.error('SocketIOService not available for broadcasting');
        }
      } catch (error) {
        console.error('Failed to broadcast channel creation:', error);
      }
      
      return reply.status(201).send({ channel });
    } catch (error: any) {
      server.log.error('Failed to create channel:', error);
      server.log.error('Error message:', error.message);
      server.log.error('Error stack:', error.stack);
      return reply.status(400).send({ error: error.message || 'Failed to create channel' });
    }
  });

  /**
   * Get user's channels
   */
  server.get('/api/chat/channels', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }

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
   * Get all available channels (public + protected, for discovery)
   */
  server.get('/api/chat/channels/all', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const channels = await ChatService.getAllChannels();
      
      return reply.status(200).send({ channels });
    } catch (error) {
      server.log.error('Failed to get all channels:', error);
      return reply.status(500).send({ error: 'Failed to get all channels' });
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
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }
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
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }
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
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }
      const { channelId } = request.params;
      const { message } = request.body;

      // Check if user is a member of the channel, if not, auto-join for public channels
      try {
        const msg = await ChatService.sendChannelMessage(userId, channelId, message);
        
        // Broadcast message to all connected users in real-time
        try {
          const socketIOService = (global as any).socketIOService;
          if (socketIOService && socketIOService.getIO) {
            const io = socketIOService.getIO();
            io.emit('channel_message', { 
              channelId, 
              message: msg,
              timestamp: new Date().toISOString()
            });
            console.log('Broadcasted message to channel:', channelId);
          } else {
            console.error('SocketIOService not available for message broadcasting');
          }
        } catch (broadcastError) {
          console.error('Failed to broadcast message:', broadcastError);
        }
        
        return reply.status(201).send({ message: msg });
      } catch (error: any) {
        // If user is not a member, try to auto-join if it's a public channel
        if (error.message === 'Not a member of this channel') {
          try {
            // Get channel info to check if it's public
            const allChannels = await ChatService.getAllChannels();
            const channel = allChannels.find(c => c.id === channelId);
            
            if (channel && channel.type === 'public') {
              // Auto-join public channel
              await ChatService.joinChannel(userId, channelId);
              // Now try sending the message again
              const msg = await ChatService.sendChannelMessage(userId, channelId, message);
              
              // Broadcast message to all connected users in real-time
              try {
                const socketIOService = (global as any).socketIOService;
                if (socketIOService && socketIOService.getIO) {
                  const io = socketIOService.getIO();
                  io.emit('channel_message', { 
                    channelId, 
                    message: msg,
                    timestamp: new Date().toISOString()
                  });
                  console.log('Broadcasted auto-joined message to channel:', channelId);
                } else {
                  console.error('SocketIOService not available for auto-joined message broadcasting');
                }
              } catch (broadcastError) {
                console.error('Failed to broadcast auto-joined message:', broadcastError);
              }
              
              return reply.status(201).send({ message: msg });
            } else {
              return reply.status(403).send({ error: 'Not a member of this channel. Protected channels require password to join.' });
            }
          } catch (joinError: any) {
            server.log.error('Failed to auto-join channel:', joinError);
            return reply.status(400).send({ error: 'Failed to join channel' });
          }
        } else {
          throw error;
        }
      }
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
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }
      
      const { channelId } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit) : 50;

      // Check if user is a member of the channel
      const isMember = await ChatService.checkChannelMembership(userId, channelId);
      
      if (!isMember) {
        // Check if it's a public channel (auto-join)
        const allChannels = await ChatService.getAllChannels();
        const channel = allChannels.find(c => c.id === channelId);
        
        if (channel && channel.type === 'public') {
          // Auto-join public channel
          try {
            await ChatService.joinChannel(userId, channelId);
          } catch (joinError) {
            // Ignore if already member
          }
        } else {
          return reply.status(403).send({ error: 'Not a member of this channel' });
        }
      }

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
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }
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
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }
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
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }

      const invitations = await ChatService.getPendingInvitations(userId);
      
      return reply.status(200).send({ invitations });
    } catch (error) {
      server.log.error('Failed to get invitations:', error);
      return reply.status(500).send({ error: 'Failed to get invitations' });
    }
  });
}

