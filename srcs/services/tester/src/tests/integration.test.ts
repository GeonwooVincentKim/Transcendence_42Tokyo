import { TestClient, TestDataGenerator, TestAssertions } from '../utils/testHelpers';

/**
 * 통합 테스트 - 전체 프로젝트 사용법 예제
 * 
 * 이 테스트는 다음을 보여줍니다:
 * 1. Backend API 사용법
 * 2. Frontend와 Backend 통합
 * 3. Docker 서비스 상태 확인
 * 4. 데이터베이스 연결 확인
 */
describe('Pong Game Project - 통합 사용법', () => {
  let client: TestClient;

  beforeAll(() => {
    client = new TestClient({
      baseUrl: process.env['TEST_BASE_URL'] || 'http://localhost:8000',
      timeout: 15000,
      retries: 5,
    });
  });

  describe('1. Backend 서비스 사용법', () => {
    it('should start backend server and respond to health check', async () => {
      // Backend 서버가 실행 중인지 확인
      const response = await client.get('/');
      
      TestAssertions.expectStatus(response, 200);
      TestAssertions.expectData(response);
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('ok');
    });

    it('should handle API endpoints correctly', async () => {
      // API 엔드포인트 테스트
      const pingResponse = await client.get('/api/ping');
      TestAssertions.expectStatus(pingResponse, 200);
      
      const gameStateResponse = await client.get('/api/game/state');
      TestAssertions.expectStatus(gameStateResponse, 200);
      TestAssertions.expectField(gameStateResponse, 'score');
    });
  });

  describe('2. Frontend-Backend 통합', () => {
    it('should allow frontend to communicate with backend', async () => {
      // Frontend에서 Backend API 호출 시뮬레이션
      const headers = {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
      };

      const response = await client.get('/api/game/state', headers);
      TestAssertions.expectStatus(response, 200);
      TestAssertions.expectData(response);
    });

    it('should handle CORS correctly', async () => {
      // CORS 헤더 확인
      const response = await client.get('/api/ping');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers['access-control-allow-origin']).toContain('*');
    });
  });

  describe('3. 사용자 인증 시스템', () => {
    it('should register new user successfully', async () => {
      const userData = TestDataGenerator.randomUser();
      
      const response = await client.post('/api/auth/register', userData);
      
      TestAssertions.expectStatus(response, 201);
      TestAssertions.expectField(response, 'user');
      TestAssertions.expectField(response, 'token');
      expect(response.data.user.username).toBe(userData.username);
    });

    it('should login existing user', async () => {
      const userData = TestDataGenerator.randomUser();
      
      // 먼저 사용자 등록
      await client.post('/api/auth/register', userData);
      
      // 로그인
      const loginResponse = await client.post('/api/auth/login', {
        username: userData.username,
        password: userData.password,
      });
      
      TestAssertions.expectStatus(loginResponse, 200);
      TestAssertions.expectField(loginResponse, 'token');
    });
  });

  describe('4. 게임 상태 관리', () => {
    it('should create and update game state', async () => {
      const gameState = TestDataGenerator.randomGameState();
      
      // 게임 상태 생성
      const createResponse = await client.post('/api/game/state', gameState);
      TestAssertions.expectStatus(createResponse, 200);
      
      // 게임 상태 조회
      const getResponse = await client.get('/api/game/state');
      TestAssertions.expectStatus(getResponse, 200);
      TestAssertions.expectField(getResponse, 'score');
      TestAssertions.expectField(getResponse, 'status');
    });

    it('should handle game state transitions', async () => {
      // 게임 시작
      const startResponse = await client.post('/api/game/start', {});
      TestAssertions.expectStatus(startResponse, 200);
      
      // 게임 일시정지
      const pauseResponse = await client.post('/api/game/pause', {});
      TestAssertions.expectStatus(pauseResponse, 200);
      
      // 게임 재개
      const resumeResponse = await client.post('/api/game/resume', {});
      TestAssertions.expectStatus(resumeResponse, 200);
    });
  });

  describe('5. WebSocket 연결', () => {
    it('should establish WebSocket connection', async () => {
      // WebSocket 연결 테스트 (실제 구현에서는 WebSocket 클라이언트 사용)
      const wsResponse = await client.get('/ws');
      
      // WebSocket 엔드포인트가 존재하는지 확인
      expect(wsResponse.status).toBeDefined();
    });
  });

  describe('6. 에러 처리', () => {
    it('should handle invalid requests gracefully', async () => {
      try {
        await client.get('/api/nonexistent');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should validate input data', async () => {
      try {
        await client.post('/api/auth/register', {});
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('7. 성능 테스트', () => {
    it('should respond within acceptable time', async () => {
      const startTime = Date.now();
      await client.get('/api/ping');
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(1000); // 1초 이내 응답
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        client.get('/api/ping')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        TestAssertions.expectStatus(response, 200);
      });
    });
  });
});

/**
 * Docker 서비스 상태 확인 테스트
 */
describe('Docker 서비스 통합', () => {
  it('should verify all services are running', async () => {
    // 이 테스트는 Docker Compose로 실행된 서비스들의 상태를 확인합니다
    const client = new TestClient();
    
    // Backend 서비스 확인
    const backendResponse = await client.get('/');
    expect(backendResponse.status).toBe(200);
    
    // Frontend 서비스는 별도 포트에서 확인 필요
    // 실제 환경에서는 Cypress를 사용하여 E2E 테스트 수행
  });
});

/**
 * 개발 환경 설정 테스트
 */
describe('개발 환경 설정', () => {
  it('should have correct environment variables', () => {
    // 환경변수 확인
    expect(process.env['NODE_ENV']).toBeDefined();
    expect(process.env['TEST_BASE_URL']).toBeDefined();
  });

  it('should have proper TypeScript configuration', () => {
    // TypeScript 설정 확인
    expect(typeof TestClient).toBe('function');
    expect(typeof TestDataGenerator).toBe('function');
    expect(typeof TestAssertions).toBe('function');
  });
});
