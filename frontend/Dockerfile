# Multi-stage Dockerfile for HackMatch Frontend

# Development stage
FROM node:18-alpine AS development

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose development port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx user and set permissions
RUN addgroup -g 1001 -S nginx-group && \
    adduser -S nginx-user -u 1001 -G nginx-group && \
    chown -R nginx-user:nginx-group /usr/share/nginx/html && \
    chown -R nginx-user:nginx-group /var/cache/nginx && \
    chown -R nginx-user:nginx-group /var/log/nginx && \
    chown -R nginx-user:nginx-group /etc/nginx/conf.d

# Create pid directory
RUN mkdir -p /var/run/nginx && \
    chown -R nginx-user:nginx-group /var/run/nginx

# Switch to non-root user
USER nginx-user

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Testing stage
FROM node:18-alpine AS testing

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Run tests
RUN npm run test

# Linting stage
FROM node:18-alpine AS linting

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Run linting
RUN npm run lint

# Security scanning stage
FROM node:18-alpine AS security

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Run security audit
RUN npm audit --audit-level=high

# Final production image
FROM production AS final

# Add labels for metadata
LABEL maintainer="HackMatch Team <team@unified-hackathon.com>"
LABEL version="1.0.0"
LABEL description="HackMatch Platform Frontend"
LABEL org.opencontainers.image.source="https://github.com/your-org/hackathon-platform"
LABEL org.opencontainers.image.documentation="https://github.com/your-org/hackathon-platform/blob/main/README.md"
LABEL org.opencontainers.image.licenses="MIT"

