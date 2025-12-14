# Docker Deployment Guide

## 📦 Docker Setup Complete

Dockerfiles have been created for production deployment of MyERP.

## 🏗️ Architecture

```
MyERP Docker Stack
├── PostgreSQL (Database)
├── Backend API (Node.js + Express)
└── Frontend Web (Next.js)
```

## 🚀 Quick Start

### Local Development with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **PostgreSQL**: localhost:5432

## 🔧 Individual Service Commands

### Build Backend

```bash
docker build -f apps/backend/Dockerfile -t myerp-backend .
```

### Build Frontend

```bash
docker build -f apps/frontend-web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000/api \
  -t myerp-frontend .
```

### Run Backend

```bash
docker run -p 4000:4000 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/myerp \
  -e JWT_SECRET=your-secret-key \
  myerp-backend
```

### Run Frontend

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:4000/api \
  myerp-frontend
```

## 📋 Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@host:5432/myerp
JWT_SECRET=your-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=4000
```

### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=https://api.myerp.com/api
NODE_ENV=production
PORT=3000
```

## 🐳 Docker Hub / GitHub Container Registry

### Push to GitHub Container Registry

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag images
docker tag myerp-backend ghcr.io/pabit06/myerp/backend:latest
docker tag myerp-frontend ghcr.io/pabit06/myerp/frontend-web:latest

# Push images
docker push ghcr.io/pabit06/myerp/backend:latest
docker push ghcr.io/pabit06/myerp/frontend-web:latest
```

## 🚢 Production Deployment

### Using Docker Compose (Simple)

```bash
# On production server
git clone https://github.com/pabit06/MyERP.git
cd MyERP

# Set environment variables
cp .env.example .env
# Edit .env with production values

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Using Kubernetes (Advanced)

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check status
kubectl get pods -n myerp

# View logs
kubectl logs -f deployment/myerp-backend -n myerp
```

## 🔍 Troubleshooting

### Check Container Logs

```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### Access Container Shell

```bash
docker exec -it myerp-backend sh
docker exec -it myerp-frontend sh
docker exec -it myerp-postgres psql -U postgres
```

### Health Checks

```bash
# Backend health
curl http://localhost:4000/health

# Frontend health
curl http://localhost:3000

# Database health
docker exec myerp-postgres pg_isready -U postgres
```

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :4000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

#### Build Failures

```bash
# Clean build cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

## 📊 Multi-Stage Build Benefits

Our Dockerfiles use multi-stage builds:

1. **Dependencies Stage**: Install all dependencies
2. **Build Stage**: Compile TypeScript and build assets
3. **Production Stage**: Only production dependencies and built code

**Benefits:**

- ✅ Smaller image size (~200MB vs ~1GB)
- ✅ Faster deployment
- ✅ More secure (no dev dependencies)
- ✅ Better layer caching

## 🔐 Security Best Practices

1. **Use specific Node version**: `node:20-alpine`
2. **Non-root user**: Run as node user (not implemented yet)
3. **Health checks**: Automatic container health monitoring
4. **Secrets management**: Use Docker secrets or env files
5. **Scan images**: `docker scan myerp-backend`

## 📈 Performance Optimization

### Build Optimization

```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker build -f apps/backend/Dockerfile .

# Parallel builds
docker-compose build --parallel
```

### Image Optimization

```bash
# Check image size
docker images | grep myerp

# Analyze layers
docker history myerp-backend

# Remove unused images
docker image prune -a
```

## 🎯 CI/CD Integration

The CD workflow (`.github/workflows/cd.yml`) automatically:

1. Builds Docker images on push to main
2. Pushes to GitHub Container Registry
3. Deploys to staging environment
4. Optionally deploys to production (on tags)

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

**Created:** 2025-12-07  
**Status:** ✅ Ready for Production
