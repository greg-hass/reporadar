# ── Stage 1: build the frontend + install all deps ─────────────────────────
FROM node:20-slim AS build
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
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Production deps only (for express, pg, node-cron)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Built frontend + compiled server from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

# Run the compiled server
CMD ["node", "dist-server/server/index.js"]
