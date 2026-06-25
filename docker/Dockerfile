# Multi-stage build

# Stage 1: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app

COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

COPY backend/src ./src
COPY backend/prisma ./prisma
RUN npm run build

# Stage 2: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

COPY frontend . .
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy backend dependencies and build
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/prisma ./backend/prisma
COPY backend/package*.json ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY frontend/package*.json ./frontend/

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]