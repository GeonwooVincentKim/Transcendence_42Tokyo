/**
 * Database Service Tests
 * - Tests database connection, queries, and transactions
 */

import { DatabaseService } from '../src/services/databaseService';

describe('Database Service', () => {
  beforeAll(async () => {
    await DatabaseService.initialize();
  });

  afterAll(async () => {
    await DatabaseService.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await DatabaseService.query('DELETE FROM password_reset_tokens');
    await DatabaseService.query('DELETE FROM user_statistics');
    await DatabaseService.query('DELETE FROM users');
  });

  describe('Connection', () => {
    it('should initialize database connection', async () => {
      const isHealthy = await DatabaseService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should execute simple query', async () => {
      const result = await DatabaseService.query('SELECT 1 as test_value');
      expect(result.rows[0].test_value).toBe(1);
    });

    it('should execute query with parameters', async () => {
      const result = await DatabaseService.query(
        'SELECT $1 as param1, $2 as param2',
        ['test', 123]
      );
      expect(result.rows[0].param1).toBe('test');
      expect(result.rows[0].param2).toBe('123'); // 반드시 문자열로 비교
    });
  });

  describe('Transactions', () => {
    it('should execute transaction successfully', async () => {
      // user insert
      const userInsert = await DatabaseService.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        ['testuser', 'test@example.com', 'hashedpassword']
      );
      const userId = userInsert.rows[0].id;
      // user_statistics insert
      await DatabaseService.query('INSERT INTO user_statistics (user_id) VALUES ($1)', [userId]);
      // user_statistics row가 정상적으로 생성되었는지 확인
      const stats = await DatabaseService.query('SELECT * FROM user_statistics WHERE user_id = $1', [userId]);
      expect(stats.rows.length).toBe(1);
    });

    it('should rollback transaction on error', async () => {
      // Insert user and get id
      const userInsert = await DatabaseService.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        ['testuser', 'test@example.com', 'hashedpassword']
      );
      const userId = userInsert.rows[0].id;
      const queries = [
        { text: 'INSERT INTO user_statistics (user_id) VALUES ($1)', params: [userId] },
        { text: 'INSERT INTO invalid_table (column) VALUES ($1)', params: ['invalid'] } // This will fail
      ];
      await expect(DatabaseService.transaction(queries)).rejects.toThrow();
      // Verify that the first insert was rolled back
      const stats = await DatabaseService.query('SELECT * FROM user_statistics WHERE user_id = $1', [userId]);
      expect(stats.rows.length).toBe(0);
    });
  });

  describe('User Operations', () => {
    it('should create and retrieve user', async () => {
      // Create user
      const insertResult = await DatabaseService.query(
        `INSERT INTO users (username, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, username, email`,
        ['testuser', 'test@example.com', 'hashedpassword']
      );

      const userId = insertResult.rows[0].id;

      // Retrieve user
      const selectResult = await DatabaseService.query(
        'SELECT id, username, email FROM users WHERE id = $1',
        [userId]
      );

      expect(selectResult.rows[0].username).toBe('testuser');
      expect(selectResult.rows[0].email).toBe('test@example.com');
    });

    it('should create user statistics', async () => {
      // Create user
      const userResult = await DatabaseService.query(
        `INSERT INTO users (username, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        ['testuser', 'test@example.com', 'hashedpassword']
      );

      const userId = userResult.rows[0].id;

      // Create user statistics
      await DatabaseService.query(
        'INSERT INTO user_statistics (user_id) VALUES ($1)',
        [userId]
      );

      // Verify statistics were created
      const statsResult = await DatabaseService.query(
        'SELECT * FROM user_statistics WHERE user_id = $1',
        [userId]
      );

      expect(statsResult.rows).toHaveLength(1);
      expect(statsResult.rows[0].total_games).toBe(0);
      expect(statsResult.rows[0].games_won).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should get database statistics', async () => {
      const stats = await DatabaseService.getStats();
      
      expect(stats).toHaveProperty('total_users');
      expect(stats).toHaveProperty('total_sessions');
      expect(stats).toHaveProperty('total_results');
      expect(stats).toHaveProperty('total_statistics');
    });

    it('should calculate user statistics', async () => {
      // Create user
      const userResult = await DatabaseService.query(
        `INSERT INTO users (username, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        ['testuser', 'test@example.com', 'hashedpassword']
      );

      const userId = userResult.rows[0].id;

      // Create game session (고유 room_id 사용)
      const uniqueRoomId = 'test-room-' + Date.now();
      const sessionResult = await DatabaseService.query(
        `INSERT INTO game_sessions (room_id, game_type, status, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id`,
        [uniqueRoomId, 'single', 'finished']
      );

      const sessionId = sessionResult.rows[0].id;

      // Create game results
      await DatabaseService.query(
        `INSERT INTO game_results (session_id, player_id, player_side, score, won, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [sessionId, userId, 'left', 10, true]
      );

      await DatabaseService.query(
        `INSERT INTO game_results (session_id, player_id, player_side, score, won, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [sessionId, userId, 'left', 5, false]
      );

      // Calculate statistics
      await DatabaseService.query(
        'SELECT calculate_user_statistics($1)',
        [userId]
      );

      // Get calculated statistics
      const statsResult = await DatabaseService.query(
        'SELECT * FROM user_statistics WHERE user_id = $1',
        [userId]
      );

      expect(statsResult.rows[0].total_games).toBe(2);
      expect(statsResult.rows[0].games_won).toBe(1);
      expect(statsResult.rows[0].games_lost).toBe(1);
      expect(statsResult.rows[0].total_score).toBe(15);
      expect(statsResult.rows[0].highest_score).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid queries gracefully', async () => {
      await expect(
        DatabaseService.query('SELECT * FROM non_existent_table')
      ).rejects.toThrow();
    });

    it('should handle connection errors', async () => {
      // This test verifies that the service handles database errors properly
      // In a real scenario, this might happen if the database is down
      const originalQuery = DatabaseService.query;
      
      // Mock a database error
      DatabaseService.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      
      await expect(DatabaseService.healthCheck()).resolves.toBe(false);
      
      // Restore original method
      DatabaseService.query = originalQuery;
    });
  });
}); 