# Base image with OpenSSL
FROM node:22-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends openssl fontconfig fonts-dejavu-core \
	&& rm -rf /var/lib/apt/lists/*

# Stage 1: Build
FROM base AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Prisma generate needs DATABASE_URL during build
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Production Run
FROM base

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy PDF branding assets used at runtime
COPY --from=builder /app/src/assets/pdf ./src/assets/pdf

# Copy skill artifacts served by the skills hub
COPY --from=builder /app/src/skills ./src/skills

# Copy generated Prisma Client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy prisma directory (required for migrations)
COPY prisma ./prisma

# Copy startup script
COPY start.sh ./start.sh

# Expose the port
EXPOSE 3001

# Start the application
CMD ["./start.sh"]
