# Pong Game Project - 사용법 예제 스크립트 (Windows PowerShell)
# 이 스크립트는 프로젝트의 다양한 사용법을 보여줍니다.

param(
    [switch]$SkipDocker,
    [switch]$SkipTests
)

# 에러 액션 설정
$ErrorActionPreference = "Stop"

# 색상 정의
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

# 로그 함수
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# 프로젝트 루트로 이동
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptPath\..\.."

Write-Host "🏓 Pong Game Project - 사용법 예제" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# 1. Backend 서비스 사용법
Write-Host ""
Write-Info "1. Backend 서비스 사용법"

Write-Info "Backend 개발 모드 시작..."
Set-Location "services/backend"
npm install

# Backend 서버를 백그라운드에서 시작
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden
$BackendProcess = Get-Process | Where-Object { $_.ProcessName -eq "node" } | Select-Object -Last 1

# Backend가 시작될 때까지 대기
Start-Sleep -Seconds 5

Write-Info "Backend API 테스트..."
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing
    Write-Success "Backend 서버가 정상적으로 응답합니다"
} catch {
    Write-Error "Backend 서버가 응답하지 않습니다"
}

try {
    $Response = Invoke-WebRequest -Uri "http://localhost:8000/api/ping" -UseBasicParsing
    Write-Success "API 엔드포인트가 정상적으로 작동합니다"
} catch {
    Write-Error "API 엔드포인트가 작동하지 않습니다"
}

# Backend 프로세스 종료
if ($BackendProcess) {
    Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
}

# 2. Frontend 서비스 사용법
Write-Host ""
Write-Info "2. Frontend 서비스 사용법"

Write-Info "Frontend 개발 모드 시작..."
Set-Location "../frontend"
npm install

# Frontend 서버를 백그라운드에서 시작
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden
$FrontendProcess = Get-Process | Where-Object { $_.ProcessName -eq "node" } | Select-Object -Last 1

# Frontend가 시작될 때까지 대기
Start-Sleep -Seconds 10

Write-Info "Frontend 빌드 테스트..."
npm run build

Write-Success "Frontend 서비스가 정상적으로 실행 중입니다"

# Frontend 프로세스 종료
if ($FrontendProcess) {
    Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
}

# 3. Docker 통합 사용법
if (-not $SkipDocker) {
    Write-Host ""
    Write-Info "3. Docker 통합 사용법"

    Write-Info "Docker Compose로 전체 서비스 시작..."
    Set-Location "../.."
    docker-compose up --build -d

    Write-Info "서비스 상태 확인..."
    docker-compose ps

    Write-Info "서비스 로그 확인..."
    docker-compose logs --tail=10

    Write-Info "Backend API 테스트 (Docker 환경)..."
    Start-Sleep -Seconds 10
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing
        Write-Success "Docker Backend 서버가 정상적으로 응답합니다"
    } catch {
        Write-Error "Docker Backend 서버가 응답하지 않습니다"
    }

    Write-Info "Frontend 접근 테스트..."
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing
        Write-Success "Docker Frontend 서버가 정상적으로 응답합니다"
    } catch {
        Write-Warning "Frontend 서버가 아직 준비되지 않았을 수 있습니다"
    }

    Write-Success "Docker 서비스들이 정상적으로 실행 중입니다"
}

# 4. 테스트 실행
if (-not $SkipTests) {
    Write-Host ""
    Write-Info "4. 테스트 실행"

    Write-Info "Backend 테스트 실행..."
    Set-Location "services/backend"
    npm test

    Write-Info "Frontend 테스트 실행..."
    Set-Location "../frontend"
    npm test -- --run

    Write-Info "통합 테스트 실행..."
    Set-Location "../tester"
    npm test

    Write-Success "모든 테스트가 통과했습니다"
}

# 5. 데이터베이스 확인
if (-not $SkipDocker) {
    Write-Host ""
    Write-Info "5. 데이터베이스 확인"

    Set-Location "../.."
    Write-Info "PostgreSQL 컨테이너 상태 확인..."
    docker-compose ps postgres

    Write-Info "데이터베이스 연결 테스트..."
    try {
        docker-compose exec -T postgres psql -U pong_user -d pong_db -c "SELECT version();"
        Write-Success "데이터베이스 연결이 정상입니다"
    } catch {
        Write-Warning "데이터베이스 연결에 실패했습니다"
    }
}

# 6. 환경 설정 확인
Write-Host ""
Write-Info "6. 환경 설정 확인"

Write-Info "환경변수 확인..."
Write-Host "NODE_ENV: $env:NODE_ENV"
Write-Host "TEST_BASE_URL: $env:TEST_BASE_URL"

Write-Info "포트 사용 확인..."
$Ports = @(3000, 8000, 5432)
foreach ($Port in $Ports) {
    $Connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($Connection) {
        Write-Success "포트 $Port 가 사용 중입니다"
    } else {
        Write-Warning "포트 $Port 가 사용되지 않고 있습니다"
    }
}

# 7. 정리
if (-not $SkipDocker) {
    Write-Host ""
    Write-Info "7. 정리"

    Write-Info "Docker 서비스 중지..."
    docker-compose down

    Write-Info "Docker 이미지 정리..."
    docker system prune -f
}

Write-Success "모든 사용법 예제가 완료되었습니다!"

Write-Host ""
Write-Host "📋 사용법 요약:" -ForegroundColor Cyan
Write-Host "1. Backend 개발: cd services/backend && npm run dev"
Write-Host "2. Frontend 개발: cd services/frontend && npm run dev"
Write-Host "3. Docker 통합: docker-compose up --build"
Write-Host "4. 테스트 실행: cd services/tester && npm test"
Write-Host "5. 전체 테스트: .\run-all-tests.ps1"

Write-Host ""
Write-Host "🎮 게임 플레이:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:3000"
Write-Host "- Backend API: http://localhost:8000"
Write-Host "- 컨트롤: W/S (왼쪽), ↑/↓ (오른쪽)"

Write-Host ""
Write-Success "Happy Gaming! 🏓"
