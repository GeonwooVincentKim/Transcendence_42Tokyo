/**
 * Authentication Routes
 * 
 * Handles user registration, login, and profile management endpoints.
 * Uses JWT tokens for authentication and bcrypt for password hashing.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
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
  // Register JWT plugin
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  });

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
} 