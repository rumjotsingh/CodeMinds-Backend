# 🐳 CodeMind Backend - Docker Deployment Guide

## 📋 Prerequisites

- Docker Desktop installed (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- At least 4GB RAM available
- Ports 80, 443, 8080, 27017, 6379 available

## 🚀 Quick Start

### 1. **Environment Setup**

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
# MongoDB (for Docker Compose)
MONGO_PASSWORD=YourSecurePassword123

# Redis (for Docker Compose)
REDIS_PASSWORD=YourRedisPassword123

# Upstash Redis (Cloud)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# JWT Secret
JWT_SECRET=your-super-secret-key-here

# External APIs
RAPIDAPI_KEY=your-rapidapi-key
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 2. **Build and Run with Docker Compose**

#### **Full Stack (Backend + MongoDB + Redis + Nginx)**
```bash
docker-compose up -d
```

#### **Development Mode (Hot Reload)**
```bash
docker-compose -f docker-compose.dev.yml up
```

#### **Backend Only (Using Cloud Services)**
```bash
docker-compose up backend
```

### 3. **Verify Deployment**

Check running containers:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f backend
```

Test API:
```bash
curl http://localhost:8080/health
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Nginx (Port 80/443)           │
│              (Reverse Proxy + SSL)              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│            CodeMind Backend (Port 8080)         │
│              (Node.js + Express)                │
└──────────┬──────────────────────────┬───────────┘
           │                          │
           ▼                          ▼
┌──────────────────────┐    ┌──────────────────────┐
│  MongoDB (Port 27017)│    │  Redis (Port 6379)   │
│    (Database)        │    │  or Upstash (Cloud)  │
└──────────────────────┘    └──────────────────────┘
```

## 📦 Docker Images

### **Available Dockerfiles**

1. **`Dockerfile`** - Standard production build
2. **`Dockerfile.production`** - Multi-stage optimized build (smaller size)

### **Build Specific Image**
```bash
# Standard build
docker build -t codemind-backend .

# Production optimized
docker build -f Dockerfile.production -t codemind-backend:prod .

# With custom tag
docker build -t codemind-backend:v1.0.0 .
```

## 🔧 Docker Compose Configurations

### **1. Full Stack Production (docker-compose.yml)**

Includes:
- MongoDB database
- Redis cache
- Backend API
- Nginx reverse proxy

```bash
docker-compose up -d
```

Access:
- API: `http://localhost:8080`
- Nginx: `http://localhost:80`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

### **2. Development Mode (docker-compose.dev.yml)**

Features:
- Hot reload enabled
- Volume mounting for live code changes
- Uses cloud services (MongoDB Atlas, Upstash)

```bash
docker-compose -f docker-compose.dev.yml up
```

### **3. Backend Only**

Run just the backend (use existing databases):
```bash
docker-compose up backend
```

## 🛠️ Common Commands

### **Container Management**

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a service
docker-compose restart backend

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend sh

# Scale backend instances
docker-compose up -d --scale backend=3
```

### **Database Operations**

```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p YourPassword

# Backup MongoDB
docker-compose exec mongodb mongodump --out /backup

# Access Redis CLI
docker-compose exec redis redis-cli -a YourRedisPassword

# Flush Redis cache
docker-compose exec redis redis-cli -a YourRedisPassword FLUSHALL
```

### **Cleanup**

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all

# Prune unused Docker resources
docker system prune -a
```

## 🔐 SSL/TLS Configuration (Production)

### **Using Let's Encrypt**

1. Install Certbot:
```bash
# Windows (via Chocolatey)
choco install certbot

# Linux/Mac
sudo apt-get install certbot  # Ubuntu/Debian
brew install certbot          # macOS
```

2. Generate certificates:
```bash
certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

3. Copy certificates to SSL folder:
```bash
mkdir ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/
```

4. Update `nginx.conf` with your domain name

5. Restart Nginx:
```bash
docker-compose restart nginx
```

### **Using Self-Signed Certificates (Development)**

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./ssl/privkey.pem \
  -out ./ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## 🌐 Environment Modes

### **Development**
```bash
NODE_ENV=development docker-compose -f docker-compose.dev.yml up
```
Features: Hot reload, verbose logging, development tools

### **Production**
```bash
NODE_ENV=production docker-compose up -d
```
Features: Optimized build, minimal logging, security headers

### **Testing**
```bash
NODE_ENV=test docker-compose run backend npm test
```

## 📊 Monitoring & Health Checks

### **Built-in Health Checks**

Docker Compose includes health checks for all services:

```bash
# Check service health
docker-compose ps

# View health status
docker inspect --format='{{.State.Health.Status}}' codemind-backend
```

### **Manual Health Checks**

```bash
# Backend API
curl http://localhost:8080/health

# MongoDB
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Redis
docker-compose exec redis redis-cli -a YourPassword ping
```

## 🚢 Deployment Options

### **1. Deploy to Cloud (AWS, Azure, GCP)**

```bash
# Build and push to Docker Hub
docker tag codemind-backend:latest yourusername/codemind-backend:latest
docker push yourusername/codemind-backend:latest

# Deploy using docker-compose on cloud VM
ssh your-server
git clone your-repo
docker-compose up -d
```

### **2. Deploy to Kubernetes**

```bash
# Generate Kubernetes manifests
docker-compose config > k8s-config.yml

# Or use Kompose
kompose convert -f docker-compose.yml
kubectl apply -f .
```

### **3. Deploy to Docker Swarm**

```bash
docker swarm init
docker stack deploy -c docker-compose.yml codemind
```

## 🔍 Troubleshooting

### **Port Already in Use**
```bash
# Find process using port
netstat -ano | findstr :8080  # Windows
lsof -i :8080                 # Linux/Mac

# Kill process or change port in .env
PORT=8081 docker-compose up -d
```

### **Container Won't Start**
```bash
# Check logs
docker-compose logs backend

# Inspect container
docker inspect codemind-backend

# Check resource usage
docker stats
```

### **MongoDB Connection Failed**
```bash
# Verify MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh -u admin -p YourPassword
```

### **Redis Connection Failed**
```bash
# Test Upstash Redis
curl -X GET https://your-redis.upstash.io -H "Authorization: Bearer your-token"

# Test local Redis
docker-compose exec redis redis-cli -a YourPassword ping
```

## 📈 Performance Tuning

### **Resource Limits**

Add to docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### **Scaling**

```bash
# Scale backend horizontally
docker-compose up -d --scale backend=3

# Add load balancer
docker-compose up -d --scale backend=3 nginx
```

## 🔒 Security Best Practices

1. **Use environment variables** for sensitive data
2. **Run as non-root user** (already configured)
3. **Enable HTTPS** with SSL certificates
4. **Use secrets management** for production
5. **Regular security updates** of base images
6. **Network isolation** with Docker networks
7. **Resource limits** to prevent DoS

## 📝 Production Checklist

- [ ] Environment variables configured in `.env`
- [ ] MongoDB credentials changed from defaults
- [ ] Redis password set
- [ ] JWT secret is random and secure
- [ ] SSL certificates generated and configured
- [ ] Nginx domain name updated
- [ ] Health checks passing
- [ ] Firewall configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Logs aggregation configured

## 🎯 Quick Commands Reference

```bash
# Start everything
docker-compose up -d

# View status
docker-compose ps

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Clean everything
docker-compose down -v --rmi all
```

## 🆘 Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure all required ports are available
4. Check Docker resource allocation
5. Review service health: `docker-compose ps`

---

**Your CodeMind backend is now containerized and ready for production deployment! 🚀**
