# Multi-stage build for Next.js production
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Stage 1: Dependencies
FROM base AS dependencies
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend-web/package.json ./apps/frontend-web/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM base AS build
WORKDIR /app

# Copy dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/frontend-web/node_modules ./apps/frontend-web/node_modules
COPY --from=dependencies /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

# Copy source code
COPY . .

# Build shared types first
RUN pnpm --filter @myerp/shared-types build

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js application
RUN pnpm --filter @myerp/frontend-web build

# Stage 3: Production
FROM base AS production
WORKDIR /app

# Copy package files
COPY --from=dependencies /app/package.json ./
COPY --from=dependencies /app/pnpm-lock.yaml ./
COPY --from=dependencies /app/pnpm-workspace.yaml ./
COPY --from=dependencies /app/apps/frontend-web/package.json ./apps/frontend-web/
COPY --from=dependencies /app/packages/shared-types/package.json ./packages/shared-types/

# Install only production dependencies for frontend-web and its workspace dependencies
# Using --filter with ... includes workspace dependencies
# --ignore-scripts skips prepare script (husky) which is not needed in production
RUN pnpm install --frozen-lockfile --filter @myerp/frontend-web... --prod --ignore-scripts

# Copy built Next.js application
COPY --from=build /app/apps/frontend-web/.next ./apps/frontend-web/.next
COPY --from=build /app/apps/frontend-web/public ./apps/frontend-web/public
COPY --from=build /app/apps/frontend-web/next.config.js ./apps/frontend-web/
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 0

# Start Next.js
WORKDIR /app/apps/frontend-web
CMD ["pnpm", "start"]
