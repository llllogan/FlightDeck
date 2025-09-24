# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS build
WORKDIR /app

# Make disk-backed temp & cache dirs
ENV TMPDIR=/app/.tmp
ENV npm_config_cache=/app/.npm
RUN mkdir -p /app/.tmp /app/.npm

COPY package*.json ./

# Use BuildKit cache mount at the SAME path npm uses
RUN --mount=type=cache,target=/app/.npm \
    npm ci --no-audit --no-fund --prefer-offline --omit=optional

COPY . .
RUN npm run build -- --configuration=production