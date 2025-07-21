/**
 * Auth API Integration Tests
 * - Tests user registration, login, and profile endpoints
 * - Uses PostgreSQL database for testing
 */

import request from 'supertest';
import Fastify from 'fastify';
import { authRoutes } from '../src/routes/auth';
import { DatabaseService } from '../src/services/databaseService';

describe('Auth API', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    // Initialize database for testing
    await DatabaseService.initialize();
  });

  beforeEach(async () => {
    app = Fastify();
    await app.register(authRoutes);
    await app.ready();

    // Clean up test data before each test
    await DatabaseService.query('DELETE FROM password_reset_tokens');
    await DatabaseService.query('DELETE FROM user_statistics');
    await DatabaseService.query('DELETE FROM users');
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    // Clean up and close database connection
    await DatabaseService.query('DELETE FROM password_reset_tokens');
    await DatabaseService.query('DELETE FROM user_statistics');
    await DatabaseService.query('DELETE FROM users');
    await DatabaseService.close();
  });

  it('should register a new user', async () => {
    const res = await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.username).toBe('testuser');
    expect(res.body).toHaveProperty('token');
  });

  it('should not allow duplicate registration', async () => {
    await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'dupuser', email: 'dup@example.com', password: 'password123' });

    const res = await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'dupuser', email: 'dup@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should login with correct credentials', async () => {
    await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'loginuser', email: 'login@example.com', password: 'password123' });

    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('token');
  });

  it('should not login with incorrect credentials', async () => {
    await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'wronguser', email: 'wrong@example.com', password: 'password123' });

    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ username: 'wronguser', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should get user profile with valid token', async () => {
    const registerRes = await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'profileuser', email: 'profile@example.com', password: 'password123' });

    const token = registerRes.body.token;

    const res = await request(app.server)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.username).toBe('profileuser');
  });

  it('should not get profile without token', async () => {
    const res = await request(app.server)
      .get('/api/auth/profile');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should refresh token', async () => {
    const registerRes = await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'refreshuser', email: 'refresh@example.com', password: 'password123' });

    const token = registerRes.body.token;

    const res = await request(app.server)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
  });

  it('should find username by email', async () => {
    await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'finduser', email: 'find@example.com', password: 'password123' });

    const res = await request(app.server)
      .post('/api/auth/forgot-username')
      .send({ email: 'find@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('username');
    expect(res.body.username).toBe('finduser');
  });

  it('should not find username for non-existent email', async () => {
    const res = await request(app.server)
      .post('/api/auth/forgot-username')
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('should generate password reset token', async () => {
    await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'resetuser', email: 'reset@example.com', password: 'password123' });

    const res = await request(app.server)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('resetToken');
    expect(res.body).toHaveProperty('expiresIn');
  });

  it('should reset password with valid token', async () => {
    await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'newpassuser', email: 'newpass@example.com', password: 'password123' });

    const tokenRes = await request(app.server)
      .post('/api/auth/forgot-password')
      .send({ email: 'newpass@example.com' });

    const resetToken = tokenRes.body.resetToken;

    const res = await request(app.server)
      .post('/api/auth/reset-password')
      .send({ resetToken, newPassword: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('Password reset successful');
  });

  it('should not reset password with invalid token', async () => {
    const res = await request(app.server)
      .post('/api/auth/reset-password')
      .send({ resetToken: 'invalidtoken', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should delete user account', async () => {
    const registerRes = await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'deleteuser', email: 'delete@example.com', password: 'password123' });

    const token = registerRes.body.token;

    const res = await request(app.server)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('Account deleted successfully');
  });

  it('should get all users', async () => {
    await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'user1', email: 'user1@example.com', password: 'password123' });

    await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'user2', email: 'user2@example.com', password: 'password123' });

    const res = await request(app.server)
      .get('/api/auth/users');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(2);
  });
});
