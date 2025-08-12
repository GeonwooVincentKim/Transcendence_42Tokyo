# Pong Game Project - 백업용 프로젝트 요약

## 📋 프로젝트 개요

이 프로젝트는 `en.subject.pdf`에 명시된 요구사항에 따라 개발된 멀티플레이어 Pong 게임입니다. 
현대적인 웹 기술을 사용하여 구축되었으며, 새로운 팀원의 온보딩을 쉽게 하기 위해 설계되었습니다.

## 🏗️ 프로젝트 구조

```
Trascendence/
├── en.subject.pdf              # 프로젝트 요구사항 문서 (1.6MB)
├── srcs/
│   ├── services/
│   │   ├── backend/            # Node.js + Fastify API 서버
│   │   ├── frontend/           # React + TypeScript + Vite
│   │   └── tester/             # 종합 테스팅 프레임워크
│   ├── docker-compose.yml      # 멀티 서비스 오케스트레이션
│   ├── run-all-tests.sh       # Linux/macOS 테스트 러너
│   └── run-all-tests.ps1      # Windows 테스트 러너
├── README.md                   # 한국어 문서
├── README_EN.md               # 영어 문서
├── README_JP.md               # 일본어 문서
└── TESTING.md                 # 상세 테스팅 가이드
```

## 🚀 기술 스택

### Backend Service
- **Framework**: Node.js + Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Real-time**: WebSocket
- **Testing**: Jest + Supertest

### Frontend Service
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest + Cypress
- **Styling**: TailwindCSS

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 15
- **Networking**: Custom bridge network

## 📦 주요 의존성

### Backend Dependencies
```json
{
  "fastify": "^5.4.0",
  "@fastify/cors": "^11.0.1",
  "@fastify/jwt": "^9.1.0",
  "@fastify/websocket": "^11.1.0",
  "bcryptjs": "^3.0.2",
  "pg": "^8.11.3"
}
```

### Frontend Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "vite": "^5.2.10",
  "typescript": "~5.8.3"
}
```

## 🎮 게임 기능

### 핵심 게임플레이
- 클래식 Pong 메커니즘과 현대적 개선사항
- 실시간 멀티플레이어 지원
- AI 상대와의 싱글플레이어 모드
- 점수 추적 및 통계
- 게임 상태 지속성

### 사용자 경험
- 모든 디바이스를 위한 반응형 디자인
- 부드러운 애니메이션과 시각적 피드백
- 커스터마이징 가능한 게임 설정
- 리더보드 및 랭킹
- 사용자 프로필 및 통계

## 🛠️ 개발 가이드라인

### 코드 표준
- **TypeScript**: 엄격 모드 활성화
- **ESLint**: 코드 품질 관리
- **Prettier**: 코드 포맷팅
- **테스트**: Jest + Cypress

### 테스팅 전략
1. **Unit Tests**: 개별 함수 및 컴포넌트 테스트
2. **Integration Tests**: API 엔드포인트 및 서비스 상호작용 테스트
3. **E2E Tests**: 완전한 사용자 워크플로우 테스트
4. **Performance Tests**: 응답 시간 및 부하 테스트

## 🚀 실행 방법

### 개발 환경 설정
```bash
# 저장소 클론
git clone <repository-url>
cd Trascendence

# 의존성 설치
cd srcs/services/backend && npm install
cd ../frontend && npm install
cd ../tester && npm install
cd ../..

# Docker Compose로 모든 서비스 시작
cd srcs
docker-compose up --build
```

### 접속 정보
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Database**: localhost:5432

## 🧪 테스팅

### 모든 테스트 실행
```bash
# Windows
.\run-all-tests.ps1

# Linux/macOS
./run-all-tests.sh
```

### 개별 서비스 테스트
```bash
# Backend 테스트
cd srcs/services/backend && npm test

# Frontend 테스트
cd srcs/services/frontend && npm test

# E2E 테스트
cd srcs/services/frontend && npx cypress run
```

## 📚 문서

### 주요 문서 파일
- `README.md`: 한국어 프로젝트 문서
- `README_EN.md`: 영어 프로젝트 문서
- `README_JP.md`: 일본어 프로젝트 문서
- `TESTING.md`: 상세 테스팅 가이드
- `en.subject.pdf`: 프로젝트 요구사항 문서

### 서비스별 문서
- `srcs/services/backend/README.md`: 백엔드 서비스 문서
- `srcs/services/frontend/README.md`: 프론트엔드 서비스 문서
- `srcs/services/tester/README.md`: 테스터 서비스 문서

## 🔧 환경 변수

### Backend 환경 변수
```env
NODE_ENV=production
JWT_SECRET=changeme-super-secret-key
DATABASE_URL=postgresql://pong_user:pong_password@postgres:5432/pong_db
DB_HOST=postgres
DB_PORT=5432
DB_NAME=pong_db
DB_USER=pong_user
DB_PASSWORD=pong_password
```

### Frontend 환경 변수
```env
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=Pong Game
```

## 🐛 문제 해결

### 일반적인 문제들

#### Docker 문제
```bash
# Docker 상태 확인
docker info

# Docker 서비스 재시작
docker-compose down
docker-compose up --build
```

#### 포트 충돌
```bash
# 포트 사용 확인
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/macOS
```

#### 데이터베이스 문제
```bash
# 데이터베이스 초기화
docker-compose down -v
docker-compose up --build
```

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 👥 팀 구성

- **Backend Developer**: API 및 데이터베이스 개발
- **Frontend Developer**: UI/UX 및 게임 인터페이스
- **DevOps Engineer**: Docker 및 배포
- **QA Engineer**: 테스팅 및 품질 보증

---

**백업 생성일**: $(date)
**프로젝트 버전**: 1.0.0
**마지막 업데이트**: $(date)