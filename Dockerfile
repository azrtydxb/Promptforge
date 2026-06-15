# syntax=docker/dockerfile:1.7

# ----- Stage 1: Builder -----
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma, curl + bash for the pnpm install script, ca-certificates
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl curl ca-certificates bash libatomic1 && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm via corepack (bundled with Node) — reliable, no PATH / native-lib issues.
# Pinned to pnpm 9.x to match pnpm-lock.yaml (lockfileVersion 9.0).
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies with pnpm (with cache mount for deduped symlinks)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

# Build Next.js (standalone mode already configured).
# A placeholder DATABASE_URL is set ONLY for the build: Next.js constructs the Prisma
# client while collecting page data, and the client constructor requires a connection
# string to be present. No queries run at build time (dynamic routes). The real
# DATABASE_URL is injected at runtime from Secrets Manager via the ECS task definition.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV NEXTAUTH_SECRET="build-time-placeholder-not-used-at-runtime"
ENV NEXTAUTH_URL="http://localhost:3000"
RUN pnpm build

# Clean build artifacts
RUN rm -rf .next/cache

# ----- Stage 2: Runtime (distroless) -----
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy Next.js standalone output (includes only prod deps)
COPY --from=builder --chown=1000:1000 /app/.next/standalone ./
COPY --from=builder --chown=1000:1000 /app/.next/static ./.next/static
COPY --from=builder --chown=1000:1000 /app/public ./public

# Copy only Prisma client and schema (not migrations/seeds)
COPY --from=builder --chown=1000:1000 /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder --chown=1000:1000 /app/prisma/schema.prisma ./prisma/schema.prisma

USER 1000
EXPOSE 3000

CMD ["server.js"]
