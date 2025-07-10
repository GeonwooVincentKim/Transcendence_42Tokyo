# Trascendence Project

## 프로젝트 구조
```
srcs/
├── docker-compose.yml      # Docker Compose 설정
├── services/
│   ├── backend/           # Backend 서비스
│   └── frontend/          # Frontend 서비스
```

## 실행 방법

### 1. Backend 서비스 실행
```bash
cd srcs
docker-compose up backend
```

### 2. Frontend 서비스 실행
```bash
cd services/frontend
npm install
npm run dev
```

## API 테스트

### Backend API 테스트
- URL: `http://localhost:8000/api/ping`
- 예상 응답: `{ "message": "pong" }`

### Frontend에서 API 테스트
1. Frontend 앱을 실행합니다
2. "API 테스트" 버튼을 클릭합니다
3. 응답 메시지를 확인합니다

## 환경 변수 설정

Frontend에서 사용하는 환경 변수:
- `VITE_API_URL=http://localhost:8000` (기본값)

이 설정은 `srcs/services/frontend/.env` 파일에서 관리됩니다. 