# ── Stage 1: build the frontend + install all deps ─────────────────────────
FROM node:24.21.0-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build
WORKDIR /app

# Install deps (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build the frontend (dist/)
COPY . .
RUN npm run build

# Compile the server + api to dist-server/ (CommonJS, Node target)
RUN npx tsc --project tsconfig.server.json

# ── Stage 2: slim runtime ──────────────────────────────────────────────────
FROM node:24.21.0-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Production deps only (for express, pg, node-cron)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Built frontend + compiled server from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

RUN mkdir -p /app/data && chown node:node /app/data
USER node

# Run the compiled server
CMD ["node", "dist-server/server/index.js"]
