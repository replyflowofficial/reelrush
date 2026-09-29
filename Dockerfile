# ============================================================================
# ReelRush Backend Server — Production Dockerfile (Optimized for Railway)
# Includes Node.js 20, Python 3, FFmpeg, and latest yt-dlp binary
# ============================================================================

FROM node:20-bookworm-slim

# Install Python 3, FFmpeg, curl, and CA certificates required by yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install only shared + server workspace dependencies (skip mobile app in server image)
RUN npm install --workspace=@reelrush/shared --workspace=@reelrush/server --include-workspace-root --no-audit --no-fund

# Copy shared & server source code
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Build TypeScript packages
RUN npm run build:shared && npm run build:server

ENV NODE_ENV=production
ENV PORT=4000
ENV YTDLP_PATH=/usr/local/bin/yt-dlp

EXPOSE 4000

CMD ["node", "apps/server/dist/server.js"]
