# Multi-stage build for optimization
FROM node:20-alpine AS builder

WORKDIR /app

# Package files
COPY package*.json ./
RUN npm ci --only=production

# Production image
FROM node:20-alpine

# Install ffmpeg for media processing
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy node modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /var/log && \
    chown -R nodejs:nodejs /app /var/log

USER nodejs

# Expose ports
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start application
CMD ["node", "server.js"]