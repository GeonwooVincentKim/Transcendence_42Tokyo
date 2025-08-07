import axios, { AxiosResponse } from 'axios';

/**
 * Test configuration interface
 */
export interface TestConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

/**
 * Default test configuration
 */
export const defaultTestConfig: TestConfig = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
  retries: 3,
};

/**
 * HTTP client for testing
 */
export class TestClient {
  private config: TestConfig;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = { ...defaultTestConfig, ...config };
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T = any>(
    method: string,
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<AxiosResponse<T>> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.config.retries; i++) {
      try {
        const response = await axios({
          method,
          url: `${this.config.baseUrl}${url}`,
          data,
          headers,
          timeout: this.config.timeout,
        });
        return response;
      } catch (error) {
        lastError = error as Error;
        if (i < this.config.retries - 1) {
          await this.delay(1000 * (i + 1)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, headers?: Record<string, string>): Promise<AxiosResponse<T>> {
    return this.request<T>('GET', url, undefined, headers);
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, headers?: Record<string, string>): Promise<AxiosResponse<T>> {
    return this.request<T>('POST', url, data, headers);
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, headers?: Record<string, string>): Promise<AxiosResponse<T>> {
    return this.request<T>('PUT', url, data, headers);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, headers?: Record<string, string>): Promise<AxiosResponse<T>> {
    return this.request<T>('DELETE', url, undefined, headers);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate random string
   */
  static randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random email
   */
  static randomEmail(): string {
    return `test-${this.randomString(8)}@example.com`;
  }

  /**
   * Generate random user data
   */
  static randomUser() {
    return {
      username: `user_${this.randomString(6)}`,
      email: this.randomEmail(),
      password: this.randomString(12),
    };
  }

  /**
   * Generate game state data
   */
  static randomGameState() {
    return {
      score: {
        player1: Math.floor(Math.random() * 10),
        player2: Math.floor(Math.random() * 10),
      },
      status: ['waiting', 'playing', 'paused', 'finished'][Math.floor(Math.random() * 4)],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Assertion helpers
 */
export class TestAssertions {
  /**
   * Assert response status
   */
  static expectStatus(response: AxiosResponse, status: number): void {
    expect(response.status).toBe(status);
  }

  /**
   * Assert response has data
   */
  static expectData(response: AxiosResponse): void {
    expect(response.data).toBeDefined();
  }

  /**
   * Assert response has specific field
   */
  static expectField(response: AxiosResponse, field: string): void {
    expect(response.data).toHaveProperty(field);
  }

  /**
   * Assert response time is within limit
   */
  static expectResponseTime(response: AxiosResponse, maxTime: number = 1000): void {
    expect(response.headers['x-response-time'] || 0).toBeLessThan(maxTime);
  }
}
