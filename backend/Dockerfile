# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# OpenSSL is required by Prisma engines.
RUN apk add --no-cache openssl

WORKDIR /app

# Keep dependency install cache-friendly.
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:${PATH}"

# Install only runtime dependencies.
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm install --no-save prisma@6.19.2 --no-audit --no-fund

# Reuse generated Prisma engines from build stage.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled application.
COPY --from=builder /app/dist ./dist

# Run as non-root user (numeric UID required by Kubernetes runAsNonRoot).
RUN addgroup -S -g 1001 appgroup && adduser -S -u 1001 -G appgroup appuser
USER 1001

EXPOSE 3001

CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js migrate deploy && node dist/index.js"]
