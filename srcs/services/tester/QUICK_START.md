# 🚀 Pong Game Project - 빠른 시작 가이드

이 가이드는 팀원들이 프로젝트를 빠르게 시작할 수 있도록 도와줍니다.

> **🌐 다국어 버전**: [English](QUICK_START_EN.md) | [日本語](QUICK_START_JP.md)

## 📋 필수 요구사항

- Node.js 18+
- npm 또는 yarn
- Docker (선택사항)
- Git

## ⚡ 5분 빠른 시작

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd Trascendence/srcs
```

### 2. 전체 서비스 시작 (Docker)
```bash
docker-compose up --build
```

### 3. 접속 확인
- **게임**: http://localhost:3000
- **API**: http://localhost:8000
- **Health Check**: http://localhost:8000/

## 🔧 개발 모드

### Backend 개발
```bash
cd services/backend
npm install
npm run dev
```

### Frontend 개발
```bash
cd services/frontend
npm install
npm run dev
```

## 🧪 테스트 실행

### 전체 테스트 (Windows)
```bash
.\run-all-tests.ps1
```

### 전체 테스트 (Linux/Mac)
```bash
./run-all-tests.sh
```

### 개별 테스트
```bash
# Backend 테스트
cd services/backend && npm test

# Frontend 테스트
cd services/frontend && npm test

# 통합 테스트
cd services/tester && npm test
```

## 📚 사용법 예제

### Linux/Mac
```bash
cd services/tester
npm run examples:linux
```

### Windows
```bash
cd services/tester
npm run examples:windows
```

### Docker 없이 실행
```bash
npm run examples:docker
```

## 🎮 게임 플레이

### 컨트롤
- **왼쪽 패들**: `W` (위) / `S` (아래)
- **오른쪽 패들**: `↑` (위) / `↓` (아래)

### 목표
상대방 패들을 통과하지 못하도록 공을 막으면서 상대방에게 점수를 내세요!

## 🔍 문제 해결

### 포트 충돌
```bash
# 포트 사용 확인
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Docker 정리
docker-compose down
docker system prune
```

### 의존성 문제
```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

### Docker 문제
```bash
# 캐시 없이 재빌드
docker-compose build --no-cache
```

## 📖 상세 문서

- [전체 사용법 가이드](README.md)
- [API 문서](API.md)
- [테스트 가이드](TESTING.md)

## 🆘 도움말

문제가 발생하면:
1. 이 가이드를 다시 확인
2. [전체 사용법 가이드](README.md) 참조
3. 팀원에게 문의

---

**Happy Gaming! 🏓**
