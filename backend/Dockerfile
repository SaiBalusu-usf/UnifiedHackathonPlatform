# Multi-stage Dockerfile for HackMatch Backend Services

# Development stage
FROM node:18-alpine AS development

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    bash

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose ports for all services
EXPOSE 3000 3001 3002 3003 3004 3005

# Default command (can be overridden)
CMD ["npm", "run", "dev"]

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S unified-hackathon -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    bash \
    tini

# Copy built application from builder stage
COPY --from=builder --chown=unified-hackathon:nodejs /app/dist ./dist
COPY --from=builder --chown=unified-hackathon:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=unified-hackathon:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R unified-hackathon:nodejs uploads logs

# Switch to non-root user
USER unified-hackathon

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Default command
CMD ["node", "dist/index.js"]

# Testing stage
FROM development AS testing

# Install test dependencies
RUN npm install --only=dev

# Copy test files
COPY --chown=unified-hackathon:nodejs ./src/tests ./src/tests

# Run tests
RUN npm test

# Linting stage
FROM development AS linting

# Run linting
RUN npm run lint

# Security scanning stage
FROM development AS security

# Install security scanning tools
RUN npm install -g audit-ci

# Run security audit
RUN npm audit --audit-level=high

# Final production image with security scanning
FROM production AS final

# Add labels for metadata
LABEL maintainer="HackMatch Team <team@unified-hackathon.com>"
LABEL version="1.0.0"
LABEL description="HackMatch Platform Backend Services"
LABEL org.opencontainers.image.source="https://github.com/your-org/hackathon-platform"
LABEL org.opencontainers.image.documentation="https://github.com/your-org/hackathon-platform/blob/main/README.md"
LABEL org.opencontainers.image.licenses="MIT"

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV SERVICE_NAME=unified-hackathon-service

# Final health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

