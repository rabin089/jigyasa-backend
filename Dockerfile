# Multi-stage build for NestJS (Node 20)

# 1) Builder: install deps and build TS -> JS
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src
COPY .eslint* .prettierrc ./
RUN npm run build

# 2) Runtime: smaller image with only prod deps and dist
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy package files and install only production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled app from builder
COPY --from=builder /app/dist ./dist

# If you serve static assets or need other files at runtime, copy them here
# COPY public ./public

# Environment
ENV NODE_ENV=production
# The app reads DB_* and JWT_* from environment variables

# Expose the Nest default port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start:prod"]
