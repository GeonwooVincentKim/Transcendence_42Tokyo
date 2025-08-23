/**
 * Database Service
 * 
 * Handles SQLite database connections and provides query methods.
 * Uses better-sqlite3 for better performance and reliability.
 */

import Database from 'better-sqlite3';

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  databasePath: string;
  verbose?: boolean;
}

/**
 * Database Service Class
 * Provides methods for database operations
 */
export class DatabaseService {
  private static db: Database.Database | null = null;
  private static isInitialized = false;

  /**
   * Convert PostgreSQL-style parameters ($1, $2, etc.) to SQLite-style parameters (?)
   * @param sql - SQL query with PostgreSQL-style parameters
   * @returns SQL query with SQLite-style parameters
   */
  private static convertParameters(sql: string): string {
    return sql.replace(/\$(\d+)/g, '?');
  }

  /**
   * Check if a SQL statement returns data
   * @param sql - SQL query text
   * @returns boolean - True if statement returns data
   */
  private static isSelectStatement(sql: string): boolean {
    const trimmedSql = sql.trim().toLowerCase();
    return trimmedSql.startsWith('select') || 
           trimmedSql.startsWith('pragma') ||
           trimmedSql.startsWith('explain');
  }

  /**
   * Initialize database connection
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const config: DatabaseConfig = {
      databasePath: process.env.DB_PATH || './pong.db',
      verbose: process.env.NODE_ENV === 'development'
    };

    try {
      this.db = new Database(config.databasePath, {
        verbose: config.verbose ? console.log : undefined
      });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      this.isInitialized = true;
      console.log('Database connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  static getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Execute a query with parameters
   * @param sql - SQL query text
   * @param params - Query parameters
   * @returns Promise<any[]> - Query result rows
   */
  static async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }
    
    try {
      const convertedSql = this.convertParameters(sql);
      
      // Check if this is a SELECT statement or similar that returns data
      if (!this.isSelectStatement(convertedSql)) {
        throw new Error(`This statement does not return data. Use run() instead: ${sql}`);
      }
      
      const stmt = this.db!.prepare(convertedSql);
      return stmt.all(params);
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  /**
   * Execute a single query and get the first row
   * @param sql - SQL query text
   * @param params - Query parameters
   * @returns Promise<any> - First row result
   */
  static async get(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      await this.initialize();
    }
    
    try {
      const convertedSql = this.convertParameters(sql);
      
      // Check if this is a SELECT statement or similar that returns data
      if (!this.isSelectStatement(convertedSql)) {
        throw new Error(`This statement does not return data. Use run() instead: ${sql}`);
      }
      
      const stmt = this.db!.prepare(convertedSql);
      return stmt.get(params);
    } catch (error) {
      console.error('Get query error:', error);
      throw error;
    }
  }

  /**
   * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
   * @param sql - SQL query text
   * @param params - Query parameters
   * @returns Promise<void>
   */
  static async run(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    
    try {
      const convertedSql = this.convertParameters(sql);
      const stmt = this.db!.prepare(convertedSql);
      stmt.run(params);
    } catch (error) {
      console.error('Run query error:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction with multiple queries
   * @param queries - Array of query objects with sql and params
   * @returns Promise<void>
   */
  static async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    
    try {
      this.db!.transaction(() => {
        queries.forEach((query) => {
          const convertedSql = this.convertParameters(query.sql);
          const stmt = this.db!.prepare(convertedSql);
          stmt.run(query.params || []);
        });
      })();
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  static async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Health check for database connection
   * @returns Promise<boolean> - True if database is healthy
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const result = await this.get('SELECT 1 as health_check');
      return result?.health_check === 1;
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
      const stats = await this.get(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM game_sessions) as total_sessions,
          (SELECT COUNT(*) FROM game_results) as total_results,
          (SELECT COUNT(*) FROM user_statistics) as total_statistics
      `);
      
      return stats || {};
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {};
    }
  }
} 