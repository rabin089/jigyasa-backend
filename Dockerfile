# Stage 1: Build the application
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including devDependencies for building
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Create the runtime image
FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Command to run the application
CMD ["node", "dist/main"]