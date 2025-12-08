# Multi-stage build for production
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Stage 1: Dependencies
FROM base AS dependencies
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Create directory structure and copy package.json files
RUN mkdir -p apps/backend packages/db-schema packages/shared-types
COPY apps/backend/package.json ./apps/backend/
COPY packages/db-schema/package.json ./packages/db-schema/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM base AS build
WORKDIR /app

# Copy dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=dependencies /app/packages/db-schema/node_modules ./packages/db-schema/node_modules
COPY --from=dependencies /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm --filter @myerp/db-schema generate

# Build backend
RUN pnpm --filter @myerp/backend build

# Stage 3: Production
FROM base AS production
WORKDIR /app

# Copy only production dependencies
COPY --from=dependencies /app/package.json ./
COPY --from=dependencies /app/pnpm-lock.yaml ./
COPY --from=dependencies /app/pnpm-workspace.yaml ./
COPY --from=dependencies /app/apps/backend/package.json ./apps/backend/
COPY --from=dependencies /app/packages/db-schema/package.json ./packages/db-schema/
COPY --from=dependencies /app/packages/shared-types/package.json ./packages/shared-types/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/packages/db-schema ./packages/db-schema
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist

# Generate Prisma Client in production
RUN pnpm --filter @myerp/db-schema generate

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
WORKDIR /app/apps/backend
CMD ["node", "dist/index.js"]
