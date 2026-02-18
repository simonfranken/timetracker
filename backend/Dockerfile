# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma client generation
RUN apk add --no-cache openssl

WORKDIR /app

# Install all dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm ci

# Generate Prisma client and compile TypeScript
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Install OpenSSL required by Prisma at runtime
RUN apk add --no-cache openssl

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Prisma schema + generated client from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled application
COPY --from=builder /app/dist ./dist

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
