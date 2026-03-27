# =============================================================================
# FlavorMap Web - Next.js Dockerfile (Nx Monorepo)
# =============================================================================

# --- Base Stage ---
FROM node:22-alpine AS base

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat

# Enable pnpm via corepack
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# --- Dependencies Stage ---
FROM base AS dependencies

# Copy root package files
COPY package.json pnpm-lock.yaml* ./

# Copy workspace package files
COPY apps/web/package.json ./apps/web/

# Install dependencies (including workspace dependencies)
RUN pnpm install --frozen-lockfile

# --- Development Stage ---
FROM dependencies AS development

# Copy entire project
COPY . .

# Set working directory to web app
WORKDIR /app/apps/web

# Expose port
EXPOSE 3000

# Development server with hot reload
CMD ["pnpm", "nx", "serve", "web"]

# --- Builder Stage ---
FROM dependencies AS builder

# Copy entire project
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the web app
RUN pnpm nx build web

# --- Production Stage ---
FROM base AS production

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy built application
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/

# Copy root files needed
COPY package.json ./

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

WORKDIR /app/apps/web

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Run the application
CMD ["npx", "next", "start"]
