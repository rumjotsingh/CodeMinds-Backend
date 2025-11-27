#!/bin/bash

echo "===================================="
echo " CodeMind Backend - Docker Setup"
echo "===================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    echo "Please install Docker from https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "[1/5] Docker is installed ✓"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "[2/5] Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "WARNING: Please edit .env file and add your credentials!"
    echo "Opening .env file..."
    ${EDITOR:-nano} .env
else
    echo "[2/5] .env file already exists ✓"
fi
echo ""

# Build Docker image
echo "[3/5] Building Docker image..."
docker-compose build
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build Docker image"
    exit 1
fi
echo ""

# Start containers
echo "[4/5] Starting containers..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start containers"
    exit 1
fi
echo ""

# Wait for services to be ready
echo "[5/5] Waiting for services to start..."
sleep 10
echo ""

# Check container status
echo "Container Status:"
docker-compose ps
echo ""

# Test API
echo "Testing API..."
sleep 5
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo ""
    echo "===================================="
    echo " SUCCESS! Backend is running! ✓"
    echo "===================================="
    echo ""
    echo "API: http://localhost:8080"
    echo "Health: http://localhost:8080/health"
    echo ""
    echo "View logs: docker-compose logs -f"
    echo "Stop: docker-compose down"
    echo ""
else
    echo ""
    echo "WARNING: Backend may still be starting..."
    echo "Check logs with: docker-compose logs -f backend"
    echo ""
fi
