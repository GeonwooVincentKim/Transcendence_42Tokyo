/**
 * Authentication Routes
 * 
 * Handles user registration, login, and profile management endpoints.
 * Uses JWT tokens for authentication and bcrypt for password hashing.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/userService';
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

      // Update user activity
      await UserService.updateUserActivity(user.id);

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

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username
      } as JWTPayload);

      // Update user activity
      await UserService.updateUserActivity(user.id);

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

      // Update user activity
      await UserService.updateUserActivity(user.id);

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

      // Update user activity
      await UserService.updateUserActivity(user.id);

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
} 