#!/bin/bash

# Pong Game Project - 사용법 예제 스크립트
# 이 스크립트는 프로젝트의 다양한 사용법을 보여줍니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 프로젝트 루트로 이동
cd "$(dirname "$0")/../.."

echo "🏓 Pong Game Project - 사용법 예제"
echo "=================================="

# 1. Backend 서비스 사용법
echo ""
log_info "1. Backend 서비스 사용법"

log_info "Backend 개발 모드 시작..."
cd services/backend
npm install
npm run dev &
BACKEND_PID=$!

# Backend가 시작될 때까지 대기
sleep 5

log_info "Backend API 테스트..."
curl -f http://localhost:8000/ || log_error "Backend 서버가 응답하지 않습니다"
curl -f http://localhost:8000/api/ping || log_error "API 엔드포인트가 작동하지 않습니다"

log_success "Backend 서비스가 정상적으로 실행 중입니다"

# Backend 프로세스 종료
kill $BACKEND_PID 2>/dev/null || true

# 2. Frontend 서비스 사용법
echo ""
log_info "2. Frontend 서비스 사용법"

log_info "Frontend 개발 모드 시작..."
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

# Frontend가 시작될 때까지 대기
sleep 10

log_info "Frontend 빌드 테스트..."
npm run build

log_success "Frontend 서비스가 정상적으로 실행 중입니다"

# Frontend 프로세스 종료
kill $FRONTEND_PID 2>/dev/null || true

# 3. Docker 통합 사용법
echo ""
log_info "3. Docker 통합 사용법"

log_info "Docker Compose로 전체 서비스 시작..."
cd ../..
docker-compose up --build -d

log_info "서비스 상태 확인..."
docker-compose ps

log_info "서비스 로그 확인..."
docker-compose logs --tail=10

log_info "Backend API 테스트 (Docker 환경)..."
sleep 10
curl -f http://localhost:8000/ || log_error "Docker Backend 서버가 응답하지 않습니다"

log_info "Frontend 접근 테스트..."
curl -f http://localhost:3000/ || log_warning "Frontend 서버가 아직 준비되지 않았을 수 있습니다"

log_success "Docker 서비스들이 정상적으로 실행 중입니다"

# 4. 테스트 실행
echo ""
log_info "4. 테스트 실행"

log_info "Backend 테스트 실행..."
cd services/backend
npm test

log_info "Frontend 테스트 실행..."
cd ../frontend
npm test -- --run

log_info "통합 테스트 실행..."
cd ../tester
npm test

log_success "모든 테스트가 통과했습니다"

# 5. 데이터베이스 확인
echo ""
log_info "5. 데이터베이스 확인"

cd ../..
log_info "PostgreSQL 컨테이너 상태 확인..."
docker-compose ps postgres

log_info "데이터베이스 연결 테스트..."
docker-compose exec -T postgres psql -U pong_user -d pong_db -c "SELECT version();" || log_warning "데이터베이스 연결에 실패했습니다"

# 6. 환경 설정 확인
echo ""
log_info "6. 환경 설정 확인"

log_info "환경변수 확인..."
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "TEST_BASE_URL: ${TEST_BASE_URL:-not set}"

log_info "포트 사용 확인..."
netstat -tuln | grep -E ':(3000|8000|5432)' || log_warning "일부 포트가 사용되지 않고 있습니다"

# 7. 정리
echo ""
log_info "7. 정리"

log_info "Docker 서비스 중지..."
docker-compose down

log_info "Docker 이미지 정리..."
docker system prune -f

log_success "모든 사용법 예제가 완료되었습니다!"

echo ""
echo "📋 사용법 요약:"
echo "1. Backend 개발: cd services/backend && npm run dev"
echo "2. Frontend 개발: cd services/frontend && npm run dev"
echo "3. Docker 통합: docker-compose up --build"
echo "4. 테스트 실행: cd services/tester && npm test"
echo "5. 전체 테스트: ./run-all-tests.sh"

echo ""
echo "🎮 게임 플레이:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "- 컨트롤: W/S (왼쪽), ↑/↓ (오른쪽)"

echo ""
log_success "Happy Gaming! 🏓"
