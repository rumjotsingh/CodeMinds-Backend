# 🐳 Quick Start - Docker Deployment

## ⚡ One-Command Setup

### Windows
```bash
start-docker.bat
```

### Linux/Mac
```bash
chmod +x start-docker.sh
./start-docker.sh
```

## 🚀 Manual Setup

### 1. Prerequisites
- Docker Desktop installed
- Docker Compose v2.0+

### 2. Configure Environment
```bash
# Copy template
cp .env.example .env

# Edit with your credentials
notepad .env  # Windows
nano .env     # Linux/Mac
```

### 3. Start Services
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Test API
```bash
curl http://localhost:8080/health
```

## 📊 Service URLs

- **API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **Nginx**: http://localhost:80

## 🛠️ Common Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart backend

# View logs
docker-compose logs -f backend

# Rebuild
docker-compose up -d --build

# Clean everything
docker-compose down -v --rmi all
```

## 📖 Full Documentation

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for complete guide.

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Change port in .env
PORT=8081

# Restart
docker-compose down && docker-compose up -d
```

### Can't Connect to MongoDB
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Redis Connection Failed
```bash
# Check Redis logs
docker-compose logs redis

# Or use Upstash Redis (cloud) in .env
```

## 🎯 Development Mode

```bash
# Hot reload enabled
docker-compose -f docker-compose.dev.yml up
```

## 🏗️ Production Deployment

```bash
# Build production image
docker build -f Dockerfile.production -t codemind-backend:prod .

# Run with production compose
docker-compose up -d
```

---

**Your CodeMind backend is now containerized! 🎉**
