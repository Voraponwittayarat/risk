# RiskHRMS production image.
#
# One container serves both the compiled React frontend and the NestJS API,
# mirroring the systemd deployment described in deploy/README-UBUNTU-TH.md.
# The entrypoint applies reviewed migrations with `prisma migrate deploy`
# (never `prisma db push`) before starting the server.
#
# Build from the repository root:
#   docker build -f deploy/docker/Dockerfile -t riskhrms:<commit-short> .

FROM node:22-bookworm AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit
COPY frontend/ ./
RUN npm run build

FROM node:22-bookworm AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit
COPY backend/prisma ./prisma
RUN ./node_modules/.bin/prisma generate
COPY backend/ ./
RUN npm run build

# Runtime dependencies: production packages only, plus the Prisma CLI so the
# container can run `prisma migrate deploy` offline (engines are downloaded at
# build time, never at container start).
FROM node:22-bookworm AS backend-runtime-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit \
  && npm install --no-save --no-audit \
    "prisma@$(node -e "process.stdout.write(require('./package.json').devDependencies.prisma)")"
COPY backend/prisma ./prisma
RUN ./node_modules/.bin/prisma generate

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend

# Prisma engines require OpenSSL; ca-certificates covers outbound TLS
# (Gemini/SMTP/LINE/Telegram).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=backend-runtime-deps /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist
COPY backend/package.json ./
COPY backend/prisma ./prisma
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
COPY deploy/docker/wait-for-db.cjs ./
COPY deploy/docker/container-healthcheck.cjs /usr/local/bin/container-healthcheck.cjs
COPY --chmod=0755 deploy/docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Pre-create the upload directory with the runtime user so the named volume
# inherits node:node ownership on first use.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
