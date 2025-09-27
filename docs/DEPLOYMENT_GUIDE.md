# Unified Hackathon Platform Platform Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Docker Containerization](#docker-containerization)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Google Cloud Platform Setup](#google-cloud-platform-setup)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Security Configuration](#security-configuration)
10. [Troubleshooting](#troubleshooting)

## Overview

The Unified Hackathon Platform platform is designed as a cloud-native, microservices-based application that can be deployed across various environments. This guide provides comprehensive instructions for deploying the platform from local development to production-ready cloud infrastructure.

### Architecture Overview
- **Frontend**: React application with TypeScript
- **Backend**: Node.js microservices with TypeScript
- **Database**: PostgreSQL (primary) + MongoDB (documents)
- **Message Queue**: Redis/Kafka for event processing
- **WebSocket**: Real-time communication server
- **AI Agents**: Distributed agent system
- **Load Balancer**: Nginx or cloud load balancer
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

## Prerequisites

### System Requirements
- **CPU**: Minimum 4 cores (8 cores recommended for production)
- **Memory**: Minimum 8GB RAM (16GB+ recommended for production)
- **Storage**: Minimum 50GB SSD (100GB+ recommended for production)
- **Network**: Stable internet connection with sufficient bandwidth

### Software Dependencies
- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher
- **Docker**: Version 20.x or higher
- **Docker Compose**: Version 2.x or higher
- **Kubernetes**: Version 1.24+ (for K8s deployment)
- **Git**: Latest version

### Cloud Services (for production)
- **Google Cloud Platform** (recommended) or AWS/Azure
- **PostgreSQL**: Managed database service
- **MongoDB**: Atlas or managed MongoDB service
- **Redis**: Managed Redis service
- **Container Registry**: For Docker images
- **Load Balancer**: Cloud load balancing service
- **DNS**: Domain name and DNS management

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/unified-hackathon-platform.git
cd unified-hackathon-platform
```

### 2. Environment Configuration
Create environment files for each service:

**Backend Environment (.env)**
```bash
# Create backend environment file
cp backend/.env.example backend/.env

# Edit with your configuration
nano backend/.env
```

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/unified-hackathon-platform_dev
MONGODB_URI=mongodb://localhost:27017/unified-hackathon-platform_dev

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3001/api/auth/github/callback

# Service Ports
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
TEAM_SERVICE_PORT=3003
RESUME_SERVICE_PORT=3004
TRACKING_SERVICE_PORT=3005
WEBSOCKET_PORT=3000

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Environment
NODE_ENV=development
```

**Frontend Environment (.env)**
```bash
# Create frontend environment file
cp frontend/.env.example frontend/.env
```

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GITHUB_CLIENT_ID=your-github-client-id
```

### 3. Database Setup
```bash
# Start PostgreSQL and MongoDB using Docker
docker-compose -f docker-compose.dev.yml up -d postgres mongodb redis

# Wait for databases to be ready
sleep 10

# Run database migrations
cd backend
npm run migrate

# Seed initial data (optional)
npm run seed
```

### 4. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 5. Start Development Services
```bash
# Terminal 1: Start backend services
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Start WebSocket server
cd backend
npm run websocket

# Terminal 4: Start AI agents
cd backend
npm run agents
```

### 6. Verify Installation
Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **API Health**: http://localhost:3001/health
- **WebSocket**: ws://localhost:3000

## Production Deployment

### 1. Environment Preparation
```bash
# Create production environment files
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production

# Configure production values
nano backend/.env.production
nano frontend/.env.production
```

**Production Backend Environment**
```env
# Database Configuration (use managed services)
DATABASE_URL=postgresql://user:pass@your-postgres-host:5432/unified-hackathon-platform_prod
MONGODB_URI=mongodb+srv://user:pass@your-mongodb-cluster/unified-hackathon-platform_prod

# JWT Configuration (use strong secrets)
JWT_SECRET=your-production-jwt-secret-256-bits-minimum
JWT_REFRESH_SECRET=your-production-refresh-secret-256-bits
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth Configuration (production URLs)
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback

# Service Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

# Redis Configuration (managed service)
REDIS_URL=redis://your-redis-host:6379

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 2. Build Applications
```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

### 3. Database Migration
```bash
# Run production migrations
cd backend
NODE_ENV=production npm run migrate

# Create initial admin user
NODE_ENV=production npm run create-admin
```

### 4. Start Production Services
```bash
# Start all services using PM2
npm install -g pm2

# Start backend services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs
```

**PM2 Configuration (ecosystem.config.js)**
```javascript
module.exports = {
  apps: [
    {
      name: 'auth-service',
      script: 'dist/services/auth/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'user-service',
      script: 'dist/services/user-management/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    },
    {
      name: 'team-service',
      script: 'dist/services/team-formation/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      }
    },
    {
      name: 'websocket-server',
      script: 'dist/shared/events/websocket.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'agent-manager',
      script: 'dist/agents/AgentManager.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
```

## Docker Containerization

### 1. Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000

USER node

CMD ["node", "dist/index.js"]
```

### 2. Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3. Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  # Database Services
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: unified-hackathon-platform_prod
      POSTGRES_USER: unified-hackathon-platform
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  mongodb:
    image: mongo:6-alpine
    environment:
      MONGO_INITDB_ROOT_USERNAME: unified-hackathon-platform
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: unified-hackathon-platform_prod
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  # Backend Services
  auth-service:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://unified-hackathon-platform:${POSTGRES_PASSWORD}@postgres:5432/unified-hackathon-platform_prod
      - MONGODB_URI=mongodb://unified-hackathon-platform:${MONGO_PASSWORD}@mongodb:27017/unified-hackathon-platform_prod
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3001
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - mongodb
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2

  user-service:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://unified-hackathon-platform:${POSTGRES_PASSWORD}@postgres:5432/unified-hackathon-platform_prod
      - MONGODB_URI=mongodb://unified-hackathon-platform:${MONGO_PASSWORD}@mongodb:27017/unified-hackathon-platform_prod
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - PORT=3002
    ports:
      - "3002:3002"
    depends_on:
      - postgres
      - mongodb
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2

  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    restart: unless-stopped

  # Load Balancer
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    ports:
      - "443:443"
      - "80:80"
    depends_on:
      - auth-service
      - user-service
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
```

### 4. Build and Deploy with Docker
```bash
# Create environment file
cp .env.example .env
nano .env

# Build and start services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale auth-service=3 --scale user-service=3
```

## Kubernetes Deployment

### 1. Namespace Configuration
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: unified-hackathon-platform
  labels:
    name: unified-hackathon-platform
```

### 2. ConfigMap and Secrets
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: unified-hackathon-platform-config
  namespace: unified-hackathon-platform
data:
  NODE_ENV: "production"
  DATABASE_HOST: "postgres-service"
  MONGODB_HOST: "mongodb-service"
  REDIS_HOST: "redis-service"
  FRONTEND_URL: "https://your-domain.com"

---
apiVersion: v1
kind: Secret
metadata:
  name: unified-hackathon-platform-secrets
  namespace: unified-hackathon-platform
type: Opaque
stringData:
  DATABASE_PASSWORD: "your-postgres-password"
  MONGODB_PASSWORD: "your-mongodb-password"
  REDIS_PASSWORD: "your-redis-password"
  JWT_SECRET: "your-jwt-secret"
  GOOGLE_CLIENT_SECRET: "your-google-client-secret"
```

### 3. Database Deployments
```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: unified-hackathon-platform
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: "unified-hackathon-platform_prod"
        - name: POSTGRES_USER
          value: "unified-hackathon-platform"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: unified-hackathon-platform-secrets
              key: DATABASE_PASSWORD
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: unified-hackathon-platform
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: unified-hackathon-platform
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

### 4. Backend Service Deployment
```yaml
# k8s/auth-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: unified-hackathon-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: your-registry/unified-hackathon-platform-backend:latest
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: unified-hackathon-platform-config
              key: NODE_ENV
        - name: DATABASE_URL
          value: "postgresql://unified-hackathon-platform:$(DATABASE_PASSWORD)@$(DATABASE_HOST):5432/unified-hackathon-platform_prod"
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: unified-hackathon-platform-secrets
              key: DATABASE_PASSWORD
        - name: DATABASE_HOST
          valueFrom:
            configMapKeyRef:
              name: unified-hackathon-platform-config
              key: DATABASE_HOST
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: unified-hackathon-platform-secrets
              key: JWT_SECRET
        - name: PORT
          value: "3001"
        ports:
        - containerPort: 3001
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: unified-hackathon-platform
spec:
  selector:
    app: auth-service
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

### 5. Frontend Deployment
```yaml
# k8s/frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: unified-hackathon-platform
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/unified-hackathon-platform-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: unified-hackathon-platform
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### 6. Ingress Configuration
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: unified-hackathon-platform-ingress
  namespace: unified-hackathon-platform
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  tls:
  - hosts:
    - your-domain.com
    - api.your-domain.com
    secretName: unified-hackathon-platform-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.your-domain.com
    http:
      paths:
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3001
      - path: /api/users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 3002
```

### 7. Deploy to Kubernetes
```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n unified-hackathon-platform

# Check services
kubectl get services -n unified-hackathon-platform

# Check ingress
kubectl get ingress -n unified-hackathon-platform

# View logs
kubectl logs -f deployment/auth-service -n unified-hackathon-platform

# Scale deployment
kubectl scale deployment auth-service --replicas=5 -n unified-hackathon-platform
```

## Google Cloud Platform Setup

### 1. GCP Project Setup
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize gcloud
gcloud init

# Create new project
gcloud projects create unified-hackathon-platform-platform --name="Unified Hackathon Platform Platform"

# Set project
gcloud config set project unified-hackathon-platform-platform

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
```

### 2. GKE Cluster Setup
```bash
# Create GKE cluster
gcloud container clusters create unified-hackathon-platform-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --disk-size=50GB \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade

# Get cluster credentials
gcloud container clusters get-credentials unified-hackathon-platform-cluster --zone=us-central1-a

# Install Nginx Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml
```

### 3. Managed Database Setup
```bash
# Create Cloud SQL PostgreSQL instance
gcloud sql instances create unified-hackathon-platform-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=us-central1 \
  --storage-size=20GB \
  --storage-type=SSD \
  --backup-start-time=03:00

# Create database
gcloud sql databases create unified-hackathon-platform_prod --instance=unified-hackathon-platform-postgres

# Create user
gcloud sql users create unified-hackathon-platform --instance=unified-hackathon-platform-postgres --password=your-secure-password

# Create MongoDB Atlas cluster (via web console)
# Visit https://cloud.mongodb.com and create cluster

# Create Redis instance
gcloud redis instances create unified-hackathon-platform-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_6_x
```

### 4. Container Registry Setup
```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Build and push images
docker build -t gcr.io/unified-hackathon-platform-platform/backend:latest ./backend
docker build -t gcr.io/unified-hackathon-platform-platform/frontend:latest ./frontend

docker push gcr.io/unified-hackathon-platform-platform/backend:latest
docker push gcr.io/unified-hackathon-platform-platform/frontend:latest
```

### 5. Deploy to GKE
```bash
# Update Kubernetes manifests with GCR images
sed -i 's|your-registry|gcr.io/unified-hackathon-platform-platform|g' k8s/*.yaml

# Apply configurations
kubectl apply -f k8s/

# Get external IP
kubectl get ingress -n unified-hackathon-platform

# Configure DNS (point your domain to the external IP)
```

## Monitoring and Logging

### 1. Prometheus Setup
```yaml
# monitoring/prometheus.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: unified-hackathon-platform
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'auth-service'
      static_configs:
      - targets: ['auth-service:3001']
      metrics_path: '/metrics'
    - job_name: 'user-service'
      static_configs:
      - targets: ['user-service:3002']
      metrics_path: '/metrics'

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: unified-hackathon-platform
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config-volume
          mountPath: /etc/prometheus
        - name: storage-volume
          mountPath: /prometheus
        command:
        - '/bin/prometheus'
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--web.console.libraries=/etc/prometheus/console_libraries'
        - '--web.console.templates=/etc/prometheus/consoles'
        - '--storage.tsdb.retention.time=200h'
        - '--web.enable-lifecycle'
      volumes:
      - name: config-volume
        configMap:
          name: prometheus-config
      - name: storage-volume
        emptyDir: {}
```

### 2. Grafana Setup
```yaml
# monitoring/grafana.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: unified-hackathon-platform
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: "admin123"
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
      volumes:
      - name: grafana-storage
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: grafana-service
  namespace: unified-hackathon-platform
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
```

### 3. Application Metrics
```typescript
// backend/src/shared/metrics/prometheus.ts
import promClient from 'prom-client'

// Create metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
})

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
})

export const agentTaskDuration = new promClient.Histogram({
  name: 'agent_task_duration_seconds',
  help: 'Duration of agent tasks in seconds',
  labelNames: ['agent_type', 'task_type']
})

export const agentTaskTotal = new promClient.Counter({
  name: 'agent_tasks_total',
  help: 'Total number of agent tasks',
  labelNames: ['agent_type', 'task_type', 'status']
})

// Middleware to collect HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    const route = req.route?.path || req.path
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration)
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc()
  })
  
  next()
}

// Metrics endpoint
export const metricsHandler = (req: Request, res: Response) => {
  res.set('Content-Type', promClient.register.contentType)
  res.end(promClient.register.metrics())
}
```

### 4. Logging Configuration
```typescript
// backend/src/shared/logging/logger.ts
import winston from 'winston'
import { ElasticsearchTransport } from 'winston-elasticsearch'

const esTransport = new ElasticsearchTransport({
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
  },
  index: 'unified-hackathon-platform-logs'
})

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'unified-hackathon-platform-service',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    esTransport
  ]
})

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.userId
    })
  })
  
  next()
}
```

## Security Configuration

### 1. SSL/TLS Setup
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 2. Network Policies
```yaml
# security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: unified-hackathon-platform-network-policy
  namespace: unified-hackathon-platform
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    - podSelector:
        matchLabels:
          app: auth-service
    - podSelector:
        matchLabels:
          app: user-service
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: mongodb
    ports:
    - protocol: TCP
      port: 27017
```

### 3. Pod Security Standards
```yaml
# security/pod-security.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: unified-hackathon-platform
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 4. Secrets Management
```bash
# Create secrets using kubectl
kubectl create secret generic unified-hackathon-platform-secrets \
  --from-literal=database-password=your-secure-password \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=google-client-secret=your-google-secret \
  -n unified-hackathon-platform

# Or use external secret management
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Create SecretStore for Google Secret Manager
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcpsm-secret-store
  namespace: unified-hackathon-platform
spec:
  provider:
    gcpsm:
      projectId: "unified-hackathon-platform-platform"
      auth:
        workloadIdentity:
          clusterLocation: us-central1-a
          clusterName: unified-hackathon-platform-cluster
          serviceAccountRef:
            name: external-secrets-sa
EOF
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database connectivity
kubectl exec -it deployment/auth-service -n unified-hackathon-platform -- bash
nc -zv postgres-service 5432

# Check database logs
kubectl logs deployment/postgres -n unified-hackathon-platform

# Test database connection
kubectl run -it --rm debug --image=postgres:15-alpine --restart=Never -- psql -h postgres-service -U unified-hackathon-platform -d unified-hackathon-platform_prod
```

#### 2. Service Discovery Issues
```bash
# Check service endpoints
kubectl get endpoints -n unified-hackathon-platform

# Check DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup auth-service.unified-hackathon-platform.svc.cluster.local

# Check service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://auth-service.unified-hackathon-platform.svc.cluster.local:3001/health
```

#### 3. Resource Issues
```bash
# Check resource usage
kubectl top pods -n unified-hackathon-platform
kubectl top nodes

# Check resource limits
kubectl describe pod <pod-name> -n unified-hackathon-platform

# Check events
kubectl get events -n unified-hackathon-platform --sort-by='.lastTimestamp'
```

#### 4. SSL/Certificate Issues
```bash
# Check certificate status
kubectl get certificates -n unified-hackathon-platform

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check ingress status
kubectl describe ingress unified-hackathon-platform-ingress -n unified-hackathon-platform
```

### Debugging Commands
```bash
# Get pod logs
kubectl logs -f deployment/auth-service -n unified-hackathon-platform

# Execute commands in pod
kubectl exec -it deployment/auth-service -n unified-hackathon-platform -- bash

# Port forward for local debugging
kubectl port-forward service/auth-service 3001:3001 -n unified-hackathon-platform

# Check pod status
kubectl get pods -n unified-hackathon-platform -o wide

# Describe pod for detailed information
kubectl describe pod <pod-name> -n unified-hackathon-platform

# Check resource quotas
kubectl describe resourcequota -n unified-hackathon-platform

# Monitor pod resource usage
kubectl top pod <pod-name> -n unified-hackathon-platform --containers
```

### Performance Tuning
```bash
# Horizontal Pod Autoscaler
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: unified-hackathon-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF

# Vertical Pod Autoscaler
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: auth-service-vpa
  namespace: unified-hackathon-platform
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  updatePolicy:
    updateMode: "Auto"
EOF
```

### Backup and Recovery
```bash
# Database backup
kubectl create job --from=cronjob/postgres-backup postgres-backup-manual -n unified-hackathon-platform

# Application backup
kubectl create backup unified-hackathon-platform-backup --include-namespaces unified-hackathon-platform

# Restore from backup
kubectl create restore unified-hackathon-platform-restore --from-backup unified-hackathon-platform-backup
```

---

*This deployment guide provides comprehensive instructions for deploying the Unified Hackathon Platform platform across various environments. For additional support or specific deployment scenarios, please refer to the platform documentation or contact the development team.*

