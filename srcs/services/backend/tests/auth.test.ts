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
});
