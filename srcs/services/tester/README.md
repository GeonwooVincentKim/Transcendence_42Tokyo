# 🏓 Pong Game Project - 통합 사용법 가이드

이 폴더는 **Pong Game Project의 전체 사용법과 통합 방법**을 보여주는 프레임워크입니다.

> **🌐 다국어 버전**: [English](README_EN.md) | [日本語](README_JP.md)

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [서비스별 사용법](#서비스별-사용법)
3. [통합 사용법](#통합-사용법)
4. [테스트 프레임워크](#테스트-프레임워크)
5. [문제 해결](#문제-해결)

## 🎯 프로젝트 개요

### 프로젝트 구조
```
srcs/
├── docker-compose.yml          # 전체 서비스 통합
├── run-all-tests.ps1          # Windows 테스트 스크립트
├── run-all-tests.sh           # Linux/Mac 테스트 스크립트
└── services/
    ├── backend/               # Fastify + WebSocket 서버
    ├── frontend/              # React + Vite 클라이언트
    └── tester/                # 이 폴더 - 사용법 가이드
```

### 기술 스택
- **Backend**: Fastify, TypeScript, WebSocket, PostgreSQL
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **DevOps**: Docker, Docker Compose, Nginx
- **Testing**: Jest, Vitest, Cypress

## 🚀 서비스별 사용법

### 1. Backend 서비스

#### 개발 모드 실행
```bash
cd srcs/services/backend
npm install
npm run dev
```

#### 테스트 실행
```bash
npm test                    # 단위 테스트
npm run test:watch         # 감시 모드
npm run test:coverage      # 커버리지 포함
```

#### Docker 실행
```bash
cd srcs
docker-compose up backend
```

#### 주요 스크립트
- `npm run dev`: 개발 서버 (포트 8000)
- `npm run build`: TypeScript 컴파일
- `npm start`: 프로덕션 서버 실행

### 2. Frontend 서비스

#### 개발 모드 실행
```bash
cd srcs/services/frontend
npm install
npm run dev
```

#### 테스트 실행
```bash
npm test                    # Vitest 단위 테스트
npm run test:ui            # UI 테스트 러너
npm run test:coverage      # 커버리지 포함
npm run test:e2e           # Cypress E2E 테스트
```

#### 빌드 및 배포
```bash
npm run build              # 프로덕션 빌드
npm run preview            # 빌드 결과 미리보기
```

#### Docker 실행
```bash
cd srcs
docker-compose up frontend
```

### 3. Docker 통합

#### 전체 서비스 실행
```bash
cd srcs
docker-compose up --build
```

#### 개별 서비스 실행
```bash
docker-compose up backend    # 백엔드만
docker-compose up frontend   # 프론트엔드만
docker-compose up postgres   # 데이터베이스만
```

#### 서비스 상태 확인
```bash
docker-compose ps           # 실행 중인 서비스
docker-compose logs         # 로그 확인
docker-compose down         # 서비스 중지
```

## 🔧 통합 사용법

### 1. 전체 프로젝트 시작

#### 방법 1: Docker Compose (권장)
```bash
cd srcs
docker-compose up --build
```

#### 방법 2: 개별 개발
```bash
# 터미널 1: Backend
cd srcs/services/backend
npm run dev

# 터미널 2: Frontend
cd srcs/services/frontend
npm run dev

# 터미널 3: Database (선택사항)
docker run -d --name postgres \
  -e POSTGRES_DB=pong_db \
  -e POSTGRES_USER=pong_user \
  -e POSTGRES_PASSWORD=pong_password \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. 환경 설정

#### Backend 환경변수
```bash
# .env 파일 생성
NODE_ENV=development
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://pong_user:pong_password@localhost:5432/pong_db
```

#### Frontend 환경변수
```bash
# .env 파일 생성
VITE_API_URL=http://localhost:8000
```

### 3. 포트 설정
- **Frontend**: http://localhost:3000 (개발) / http://localhost:80 (Docker)
- **Backend**: http://localhost:8000
- **Database**: localhost:5432

## 🧪 테스트 프레임워크

### 1. 단위 테스트

#### Backend 테스트
```bash
cd srcs/services/backend
npm test
```

#### Frontend 테스트
```bash
cd srcs/services/frontend
npm test
```

### 2. 통합 테스트

#### 전체 테스트 실행 (Windows)
```bash
cd srcs
.\run-all-tests.ps1
```

#### 전체 테스트 실행 (Linux/Mac)
```bash
cd srcs
./run-all-tests.sh
```

#### E2E 테스트
```bash
cd srcs/services/frontend
npm run test:e2e:run
```

### 3. 커버리지 확인
```bash
# Backend
cd srcs/services/backend
npm run test:coverage

# Frontend
cd srcs/services/frontend
npm run test:coverage
```

## 🔍 문제 해결

### 1. 포트 충돌
```bash
# 포트 사용 확인
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Docker 컨테이너 정리
docker-compose down
docker system prune
```

### 2. 의존성 문제
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### 3. Docker 문제
```bash
# Docker 캐시 정리
docker system prune -a
docker-compose build --no-cache
```

### 4. 데이터베이스 문제
```bash
# PostgreSQL 컨테이너 재시작
docker-compose restart postgres

# 데이터베이스 초기화
docker-compose down -v
docker-compose up postgres
```

## 📊 모니터링

### 1. 로그 확인
```bash
# 전체 로그
docker-compose logs

# 특정 서비스 로그
docker-compose logs backend
docker-compose logs frontend
```

### 2. 상태 확인
```bash
# 서비스 상태
docker-compose ps

# 리소스 사용량
docker stats
```

## 🚀 배포

### 1. 프로덕션 빌드
```bash
# Frontend 빌드
cd srcs/services/frontend
npm run build

# Backend 빌드
cd srcs/services/backend
npm run build
```

### 2. Docker 배포
```bash
cd srcs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📝 개발 가이드

### 1. 코드 스타일
- TypeScript 사용
- ESLint 규칙 준수
- 테스트 코드 작성
- JSDoc 주석 추가

### 2. Git 워크플로우
1. 기능 브랜치 생성
2. 변경사항 구현
3. 테스트 실행
4. 린팅 확인
5. PR 생성

### 3. 테스트 전략
- 단위 테스트: 함수/컴포넌트
- 통합 테스트: API 엔드포인트
- E2E 테스트: 사용자 시나리오

---

## 🎮 게임 플레이

### 컨트롤
- **왼쪽 패들**: `W` (위) / `S` (아래)
- **오른쪽 패들**: `↑` (위) / `↓` (아래)

### 목표
상대방 패들을 통과하지 못하도록 공을 막으면서 상대방에게 점수를 내세요!

---

**Happy Gaming! 🏓**
