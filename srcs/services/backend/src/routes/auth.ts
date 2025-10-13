/**
 * Authentication Routes
 * 
 * Handles user registration, login, and profile management endpoints.
 * Uses JWT tokens for authentication and bcrypt for password hashing.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/userService';
import { TwoFactorService } from '../services/twoFactorService';
import { FriendsService } from '../services/friendsService';
import { LoginRequest, RegisterRequest, AuthResponse, ErrorResponse } from '../types/auth';

/**
 * JWT Payload interface for token generation
 */
interface JWTPayload {
  userId: string;
  username: string;
}

/**
 * Register authentication routes with the Fastify instance
 * @param fastify - Fastify instance
 */
export async function authRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/auth/register
   * Register a new user account
   */
  fastify.post<{ Body: RegisterRequest }>('/api/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 20 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { username, email, password } = request.body;

      // Register the user
      const user = await UserService.registerUser(username, email, password);

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username
      } as JWTPayload);

      // Update user activity and online status
      await UserService.updateUserActivity(user.id);
      await FriendsService.updateOnlineStatus(user.id, 'online');

      const response: AuthResponse = {
        user,
        token
      };

      return reply.status(201).send(response);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      return reply.status(400).send(errorResponse);
    }
  });

  /**
   * POST /api/auth/login
   * Authenticate user and return JWT token
   */
  fastify.post<{ Body: LoginRequest }>('/api/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { username, password } = request.body;

      // Authenticate the user
      const user = await UserService.authenticateUser(username, password);

      // Check if 2FA is enabled
      const twoFactorEnabled = await TwoFactorService.isTwoFactorEnabled(user.id);

      if (twoFactorEnabled) {
        // Return partial response indicating 2FA is required
        return reply.status(200).send({
          requiresTwoFactor: true,
          userId: user.id,
          message: '2FA verification required'
        });
      }

      // Generate JWT token (if no 2FA)
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username
      } as JWTPayload);

      // Update user activity and online status
      await UserService.updateUserActivity(user.id);
      await FriendsService.updateOnlineStatus(user.id, 'online');

      const response: AuthResponse = {
        user,
        token
      };

      return reply.status(200).send(response);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Invalid credentials'
      };
      return reply.status(401).send(errorResponse);
    }
  });

  /**
   * GET /api/auth/profile
   * Get current user's profile (requires authentication)
   */
  fastify.get('/api/auth/profile', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
      }
    }
  }, async (request, reply) => {
    try {
      const decoded = request.user as JWTPayload;
      const user = await UserService.getUserById(decoded.userId);

      if (!user) {
        return reply.status(404).send({
          error: 'User not found',
          message: 'User no longer exists'
        });
      }

      // Update user activity and online status
      await UserService.updateUserActivity(user.id);
      await FriendsService.updateOnlineStatus(user.id, 'online');

      return reply.status(200).send({ user });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'Profile retrieval failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      return reply.status(500).send(errorResponse);
    }
  });

  /**
   * POST /api/auth/refresh
   * Refresh JWT token (requires valid token)
   */
  fastify.post('/api/auth/refresh', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
      }
    }
  }, async (request, reply) => {
    try {
      const decoded = request.user as JWTPayload;
      const user = await UserService.getUserById(decoded.userId);

      if (!user) {
        return reply.status(404).send({
          error: 'User not found',
          message: 'User no longer exists'
        });
      }

      // Generate new JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username
      } as JWTPayload);

      // Update user activity and online status
      await UserService.updateUserActivity(user.id);
      await FriendsService.updateOnlineStatus(user.id, 'online');

      const response: AuthResponse = {
        user,
        token
      };

      return reply.status(200).send(response);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      return reply.status(500).send(errorResponse);
    }
  });

  /**
   * POST /api/auth/forgot-username
   * Find username by email (for username recovery)
   */
  fastify.post<{ Body: { email: string } }>('/api/auth/forgot-username', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.body;
      const username = await UserService.findUsernameByEmail(email);
      
      if (!username) {
        return reply.status(404).send({
          error: 'User not found',
          message: 'No user found with this email address'
        });
      }

      return reply.status(200).send({
        message: 'Username found',
        username
      });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'Username recovery failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      return reply.status(500).send(errorResponse);
    }
  });

  /**
   * POST /api/auth/forgot-password
   * Generate password reset token and send to email (simulated)
   */
  fastify.post<{ Body: { email: string } }>('/api/auth/forgot-password', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.body;
      const resetToken = await UserService.generatePasswordResetToken(email);
      
      // In a real application, send email with reset token
      // For now, we'll return the token directly (for testing purposes)
      return reply.status(200).send({
        message: 'Password reset token generated',
        resetToken, // In production, this would be sent via email
        expiresIn: '30 minutes'
      });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'Password reset failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      return reply.status(400).send(errorResponse);
    }
  });

  /**
   * POST /api/auth/reset-password
   * Reset password using reset token
   */
  fastify.post<{ Body: { resetToken: string; newPassword: string } }>('/api/auth/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['resetToken', 'newPassword'],
        properties: {
          resetToken: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { resetToken, newPassword } = request.body;
      const user = await UserService.resetPassword(resetToken, newPassword);
      
      return reply.status(200).send({
        message: 'Password reset successful',
        user
      });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'Password reset failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      return reply.status(400).send(errorResponse);
    }
  });

  /**
   * DELETE /api/auth/account
   * Delete user account (requires authentication)
   */
  fastify.delete('/api/auth/account', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
      }
    }
  }, async (request, reply) => {
    try {
      const decoded = request.user as JWTPayload;
      const success = await UserService.deleteUser(decoded.userId);

      if (!success) {
        return reply.status(404).send({
          error: 'User not found',
          message: 'User no longer exists'
        });
      }

      return reply.status(200).send({
        message: 'Account deleted successfully'
      });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'Account deletion failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      return reply.status(500).send(errorResponse);
    }
  });

  /**
   * GET /api/auth/users
   * Get all users (for admin purposes)
   */
  fastify.get('/api/auth/users', async (request, reply) => {
    try {
      const users = await UserService.getAllUsers();
      return reply.status(200).send({ users });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'Failed to retrieve users',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      return reply.status(500).send(errorResponse);
    }
  });

  /**
   * POST /api/auth/verify-token
   * Test endpoint to verify JWT token
   */
  fastify.post<{ Body: { token: string } }>('/api/auth/verify-token', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { token } = request.body;
      console.log('Testing token verification for token:', token.substring(0, 20) + '...');
      
      // Try to verify the token
      const decoded = fastify.jwt.verify(token);
      console.log('Token verification successful:', decoded);
      
      return reply.status(200).send({
        valid: true,
        decoded,
        message: 'Token is valid'
      });
    } catch (error) {
      console.error('Token verification failed:', error);
      return reply.status(400).send({
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Token is invalid'
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout user and update online status
   */
  fastify.post('/api/auth/logout', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (userId) {
        // Update user to offline status
        await FriendsService.updateOnlineStatus(userId, 'offline');
      }
      
      return reply.status(200).send({ message: 'Logged out successfully' });
    } catch (error) {
      // Even if token is invalid, consider it a successful logout
      return reply.status(200).send({ message: 'Logged out successfully' });
    }
  });

  /**
   * POST /api/auth/2fa/setup
   * Setup 2FA for authenticated user
   */
  fastify.post('/api/auth/2fa/setup', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      const username = (request.user as any).username;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }

      const setup = await TwoFactorService.setupTwoFactor(userId, username);
      
      return reply.status(200).send({
        secret: setup.secret,
        qrCode: setup.qrCodeUrl,
        backupCodes: setup.backupCodes
      });
    } catch (error) {
      fastify.log.error('2FA setup failed:', error);
      return reply.status(500).send({
        error: 'Failed to setup 2FA',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/auth/2fa/enable
   * Enable 2FA after setup
   */
  fastify.post<{ Body: { token: string } }>('/api/auth/2fa/enable', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      const { token } = request.body;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }

      const verified = await TwoFactorService.enableTwoFactor(userId, token);
      
      if (!verified) {
        return reply.status(400).send({
          error: 'Invalid 2FA token'
        });
      }

      return reply.status(200).send({
        success: true,
        message: '2FA enabled successfully'
      });
    } catch (error) {
      fastify.log.error('2FA enable failed:', error);
      return reply.status(500).send({
        error: 'Failed to enable 2FA',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/auth/2fa/disable
   * Disable 2FA
   */
  fastify.post<{ Body: { token: string } }>('/api/auth/2fa/disable', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      const { token } = request.body;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }

      const verified = await TwoFactorService.disableTwoFactor(userId, token);
      
      if (!verified) {
        return reply.status(400).send({
          error: 'Invalid 2FA token'
        });
      }

      return reply.status(200).send({
        success: true,
        message: '2FA disabled successfully'
      });
    } catch (error) {
      fastify.log.error('2FA disable failed:', error);
      return reply.status(500).send({
        error: 'Failed to disable 2FA',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/auth/2fa/verify
   * Verify 2FA token during login
   */
  fastify.post<{ Body: { userId: string; token: string } }>('/api/auth/2fa/verify', async (request, reply) => {
    try {
      const { userId, token } = request.body;

      const verified = await TwoFactorService.verifyToken(userId, token);
      
      if (!verified) {
        return reply.status(400).send({
          error: 'Invalid 2FA token'
        });
      }

      // Get user info
      const user = await UserService.getUserById(userId);
      if (!user) {
        return reply.status(404).send({
          error: 'User not found'
        });
      }

      // Generate JWT token
      const jwtToken = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email
      });

      return reply.status(200).send({
        success: true,
        token: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      fastify.log.error('2FA verification failed:', error);
      return reply.status(500).send({
        error: 'Failed to verify 2FA',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/auth/2fa/status
   * Check 2FA status
   */
  fastify.get('/api/auth/2fa/status', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }

      const enabled = await TwoFactorService.isTwoFactorEnabled(userId);
      
      return reply.status(200).send({
        enabled
      });
    } catch (error) {
      fastify.log.error('Failed to check 2FA status:', error);
      return reply.status(500).send({
        error: 'Failed to check 2FA status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/auth/2fa/backup-codes
   * Regenerate backup codes
   */
  fastify.post<{ Body: { token: string } }>('/api/auth/2fa/backup-codes', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId || (request.user as any).id;
      const { token } = request.body;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid token: user ID not found' });
      }

      const backupCodes = await TwoFactorService.regenerateBackupCodes(userId, token);
      
      return reply.status(200).send({
        backupCodes
      });
    } catch (error) {
      fastify.log.error('Failed to regenerate backup codes:', error);
      return reply.status(500).send({
        error: 'Failed to regenerate backup codes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
} 