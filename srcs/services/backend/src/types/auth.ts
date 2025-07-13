/**
 * Authentication Types
 * 
 * Defines TypeScript interfaces for user authentication,
 * including user data, login/register requests, and JWT payload
 */

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithoutPassword extends Omit<User, 'password'> {
  // User data without password for safe transmission
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  user: UserWithoutPassword;
  token: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
} 