import { TestClient, TestDataGenerator, TestAssertions } from '../utils/testHelpers';

describe('API Tests', () => {
  let client: TestClient;

  beforeAll(() => {
    client = new TestClient();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await client.get('/health');
      
      TestAssertions.expectStatus(response, 200);
      TestAssertions.expectData(response);
      TestAssertions.expectField(response, 'status');
      expect(response.data.status).toBe('ok');
    });

    it('should respond within acceptable time', async () => {
      const startTime = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await client.get('/health');
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Game API', () => {
    it('should return game state', async () => {
      const response = await client.get('/api/game/state');
      
      TestAssertions.expectStatus(response, 200);
      TestAssertions.expectData(response);
      TestAssertions.expectField(response, 'score');
      TestAssertions.expectField(response, 'status');
    });

    it('should update game state', async () => {
      const gameState = TestDataGenerator.randomGameState();
      const response = await client.post('/api/game/state', gameState);
      
      TestAssertions.expectStatus(response, 200);
      TestAssertions.expectData(response);
    });
  });

  describe('User API', () => {
    it('should register new user', async () => {
      const userData = TestDataGenerator.randomUser();
      const response = await client.post('/api/auth/register', userData);
      
      TestAssertions.expectStatus(response, 201);
      TestAssertions.expectData(response);
      TestAssertions.expectField(response, 'user');
      TestAssertions.expectField(response, 'token');
    });

    it('should login user', async () => {
      const userData = TestDataGenerator.randomUser();
      
      // First register the user
      await client.post('/api/auth/register', userData);
      
      // Then login
      const response = await client.post('/api/auth/login', {
        username: userData.username,
        password: userData.password,
      });
      
      TestAssertions.expectStatus(response, 200);
      TestAssertions.expectData(response);
      TestAssertions.expectField(response, 'token');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid endpoints', async () => {
      try {
        await client.get('/api/invalid-endpoint');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should handle invalid data', async () => {
      try {
        await client.post('/api/auth/register', {});
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});
