/**
 * Auth API Integration Tests
 * - Tests user registration, login, and profile endpoints
 */

import request from 'supertest';
import Fastify from 'fastify';
import { authRoutes } from '../src/routes/auth';

describe('Auth API', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await app.register(authRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
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

  it('should not login with wrong password', async () => {
    await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'failuser', email: 'fail@example.com', password: 'password123' });

    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ username: 'failuser', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should get user profile with valid JWT', async () => {
    const regRes = await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'profileuser', email: 'profile@example.com', password: 'password123' });

    const token = regRes.body.token;

    const res = await request(app.server)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.username).toBe('profileuser');
  });

  it('should not get profile with invalid JWT', async () => {
    const res = await request(app.server)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
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

  it('should delete user account with valid JWT', async () => {
    const regRes = await request(app.server)
      .post('/api/auth/register')
      .send({ username: 'deleteuser', email: 'delete@example.com', password: 'password123' });

    const token = regRes.body.token;

    const res = await request(app.server)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('Account deleted successfully');
  });

  it('should not delete account without valid JWT', async () => {
    const res = await request(app.server)
      .delete('/api/auth/account')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should not delete non-existent account', async () => {
    const res = await request(app.server)
      .delete('/api/auth/account')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJub25leGlzdGVudCIsInVzZXJuYW1lIjoiZmFrZSIsImlhdCI6MTYzNzQ5NjAwMCwiZXhwIjoxNjM3NTgyNDAwfQ.invalid');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
