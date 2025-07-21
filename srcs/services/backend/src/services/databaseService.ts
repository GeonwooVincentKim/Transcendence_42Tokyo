/**
 * Database Service
 * 
 * Handles PostgreSQL database connections and provides query methods.
 * Uses connection pooling for better performance.
 */

import { Pool, PoolClient, QueryResult } from 'pg';

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Database Service Class
 * Provides methods for database operations
 */
export class DatabaseService {
  private static pool: Pool | null = null;
  private static isInitialized = false;

  /**
   * Initialize database connection pool
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const config: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'pong_db',
      user: process.env.DB_USER || 'pong_user',
      password: process.env.DB_PASSWORD || 'pong_password',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    };

    try {
      this.pool = new Pool(config);
      
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isInitialized = true;
      console.log('Database connection pool initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database connection pool:', error);
      throw error;
    }
  }

  /**
   * Get a client from the pool
   */
  static async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      await this.initialize();
    }
    
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    
    return this.pool.connect();
  }

  /**
   * Execute a query with parameters
   * @param text - SQL query text
   * @param params - Query parameters
   * @returns Promise<QueryResult> - Query result
   */
  static async query(text: string, params?: any[]): Promise<QueryResult> {
    const client = await this.getClient();
    
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a transaction with multiple queries
   * @param queries - Array of query objects with text and params
   * @returns Promise<any[]> - Array of query results
   */
  static async transaction(queries: Array<{ text: string; params?: any[] }>): Promise<any[]> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection pool
   */
  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
      console.log('Database connection pool closed');
    }
  }

  /**
   * Health check for database connection
   * @returns Promise<boolean> - True if database is healthy
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health_check');
      return result.rows[0]?.health_check === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   * @returns Promise<object> - Database statistics
   */
  static async getStats(): Promise<object> {
    try {
      const stats = await this.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM game_sessions) as total_sessions,
          (SELECT COUNT(*) FROM game_results) as total_results,
          (SELECT COUNT(*) FROM user_statistics) as total_statistics
      `);
      
      return stats.rows[0] || {};
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {};
    }
  }
} 