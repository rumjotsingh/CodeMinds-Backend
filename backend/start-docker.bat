@echo off
echo ====================================
echo  CodeMind Backend - Docker Setup
echo ====================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [1/5] Docker is installed
echo.

REM Check if .env file exists
if not exist .env (
    echo [2/5] Creating .env file from template...
    copy .env.example .env
    echo.
    echo WARNING: Please edit .env file and add your credentials!
    echo Press any key to open .env file in notepad...
    pause >nul
    notepad .env
) else (
    echo [2/5] .env file already exists
)
echo.

REM Build Docker image
echo [3/5] Building Docker image...
docker-compose build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build Docker image
    pause
    exit /b 1
)
echo.

REM Start containers
echo [4/5] Starting containers...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start containers
    pause
    exit /b 1
)
echo.

REM Wait for services to be ready
echo [5/5] Waiting for services to start...
timeout /t 10 /nobreak >nul
echo.

REM Check container status
echo Container Status:
docker-compose ps
echo.

REM Test API
echo Testing API...
timeout /t 5 /nobreak >nul
curl -s http://localhost:8080/health >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo  SUCCESS! Backend is running!
    echo ====================================
    echo.
    echo API: http://localhost:8080
    echo Health: http://localhost:8080/health
    echo.
    echo View logs: docker-compose logs -f
    echo Stop: docker-compose down
    echo.
) else (
    echo.
    echo WARNING: Backend may still be starting...
    echo Check logs with: docker-compose logs -f backend
    echo.
)

pause
