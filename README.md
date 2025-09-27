# Unified Hackathon Platform

A comprehensive hackathon web platform featuring AI-powered team formation, real-time tracking, and intelligent resume analysis built with modern microservices architecture.

## 🚀 Features

### Core Functionality
- **Tinder-Style Team Matching**: Swipe-based interface for discovering and connecting with potential teammates
- **AI-Powered Resume Analysis**: Intelligent parsing and skill extraction using NLP techniques
- **Real-Time Tracking**: Live location tracking, session monitoring, and activity analytics
- **Smart Team Formation**: AI-driven optimal team composition using genetic algorithms
- **Multi-Agent System**: Distributed AI agents for automated processing and coordination

### Technical Highlights
- **Microservices Architecture**: Scalable, modular backend services
- **Event-Driven Design**: Real-time communication and coordination
- **Advanced Security**: OAuth integration, JWT authentication, RBAC authorization
- **Cloud-Native**: Kubernetes-ready with Google Cloud Platform support
- **Comprehensive Monitoring**: Prometheus, Grafana, and ELK stack integration

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Load Balancer │    │   API Gateway   │
│   (React/TS)    │◄──►│   (Nginx)       │◄──►│   (Express)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
        ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
        │                                               │                                               │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │  User Service   │    │  Team Service   │    │ Resume Service  │    │Tracking Service │
│   (Port 3001)   │    │   (Port 3002)   │    │   (Port 3003)   │    │   (Port 3004)   │    │   (Port 3005)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │                        │                        │
        └────────────────────────┼────────────────────────┼────────────────────────┼────────────────────────┘
                                 │                        │                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │    MongoDB      │    │     Redis       │    │   WebSocket     │    │  AI Agents      │
│   (Primary DB)  │    │   (Documents)   │    │   (Cache/Queue) │    │   (Real-time)   │    │   (Processing)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### AI Agent System
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Profile Parsing │    │ Skill Matching  │    │ Team Formation  │
│     Agent       │    │     Agent       │    │     Agent       │
│                 │    │                 │    │                 │
│ • Resume Parse  │    │ • Compatibility │    │ • Genetic Algo  │
│ • Skill Extract │    │ • Match Scoring │    │ • Optimization  │
│ • NLP Analysis  │    │ • Recommendation│    │ • Team Balance  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Agent Manager  │
                    │                 │
                    │ • Coordination  │
                    │ • Load Balance  │
                    │ • Health Check  │
                    │ • Event Routing │
                    └─────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** for components
- **Framer Motion** for animations
- **Socket.io Client** for real-time communication

### Backend
- **Node.js 18** with TypeScript
- **Express.js** for REST APIs
- **Socket.io** for WebSocket communication
- **JWT** for authentication
- **bcrypt** for password hashing
- **Multer** for file uploads

### Databases
- **PostgreSQL 15** for relational data
- **MongoDB 6** for document storage
- **Redis 7** for caching and queues

### AI & Machine Learning
- **OpenAI GPT** for natural language processing
- **Custom algorithms** for team formation
- **Genetic algorithms** for optimization
- **Similarity scoring** for matching

### DevOps & Infrastructure
- **Docker** for containerization
- **Kubernetes** for orchestration
- **Nginx** for load balancing
- **Prometheus** for monitoring
- **Grafana** for visualization
- **ELK Stack** for logging

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### 1. Clone Repository
```bash
git clone https://github.com/your-org/unified-hackathon-platform.git
cd unified-hackathon-platform
```

### 2. Environment Setup
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit configuration
nano backend/.env
nano frontend/.env
```

### 3. Start with Docker Compose
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access the Platform
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **WebSocket**: ws://localhost:3000
- **Monitoring**: http://localhost:9090 (Prometheus)
- **Dashboards**: http://localhost:3001 (Grafana)

## 📖 Documentation

### API Documentation
Comprehensive REST API documentation with examples:
- [API Documentation](./docs/API_DOCUMENTATION.md)

### AI Agent System
Detailed guide for the multi-agent AI system:
- [Agent Documentation](./docs/AGENT_DOCUMENTATION.md)

### Deployment Guide
Complete deployment instructions for all environments:
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)

### Architecture Documentation
System design and architecture decisions:
- [Architecture Design](./architecture_design.md)
- [Database Schema](./database_schema.md)

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

### Test Coverage
- **Unit Tests**: 95%+ coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Load testing up to 1000 concurrent users

## 🔧 Development

### Local Development
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start development servers
npm run dev:all

# Or start services individually
npm run dev:auth      # Auth service (3001)
npm run dev:user      # User service (3002)
npm run dev:team      # Team service (3003)
npm run dev:websocket # WebSocket server (3000)
npm run dev:agents    # AI agents
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Security audit
npm audit

# Code formatting
npm run format
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale auth-service=3
```

### Kubernetes Deployment
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Check status
kubectl get pods -n unified-hackathon-platform

# Scale deployment
kubectl scale deployment auth-service --replicas=5
```

### Google Cloud Platform
```bash
# Create GKE cluster
gcloud container clusters create unified-hackathon-platform-cluster

# Deploy to GKE
kubectl apply -f k8s/
```

## 📊 Monitoring

### Metrics
- **Prometheus**: System and application metrics
- **Grafana**: Visual dashboards and alerts
- **Custom Metrics**: Business logic and AI agent performance

### Logging
- **Elasticsearch**: Log storage and indexing
- **Logstash**: Log processing and enrichment
- **Kibana**: Log visualization and analysis

### Health Checks
- Service health endpoints
- Database connectivity checks
- AI agent status monitoring
- Real-time system status dashboard

## 🔒 Security

### Authentication & Authorization
- **OAuth 2.0**: Google, GitHub, LinkedIn integration
- **JWT Tokens**: Secure API access with refresh tokens
- **RBAC**: Role-based access control with 6 user roles
- **2FA Ready**: Two-factor authentication infrastructure

### Security Features
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive request validation
- **XSS Protection**: Cross-site scripting prevention
- **CSRF Protection**: Cross-site request forgery prevention
- **Security Headers**: Helmet.js security headers
- **Encryption**: Data encryption at rest and in transit

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format
- **Test Coverage**: Minimum 90% coverage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT integration
- **React Team** for the amazing framework
- **Node.js Community** for excellent tooling
- **Open Source Contributors** for inspiration and libraries

## 📞 Support

### Getting Help
- **Documentation**: Check the docs folder
- **Issues**: Create a GitHub issue
- **Discussions**: Use GitHub discussions
- **Email**: team@unifiedhackathon.com

### Community
- **Discord**: [Join our Discord](https://discord.gg/unified-hackathon-platform)
- **Twitter**: [@Unified Hackathon PlatformPlatform](https://twitter.com/unified-hackathon-platformplatform)
- **LinkedIn**: [Unified Hackathon Platform Platform](https://linkedin.com/company/unified-hackathon-platform)

---

**Built with ❤️ by the Unified Hackathon Platform Team**

*Empowering hackathon participants to find their perfect teammates through AI-powered matching and real-time collaboration tools.*

