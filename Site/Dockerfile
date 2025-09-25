# syntax=docker/dockerfile:1.7

FROM node:24-bullseye AS build
WORKDIR /app

# Make disk-backed temp & cache dirs
ENV TMPDIR=/app/.tmp
ENV npm_config_cache=/app/.npm
RUN mkdir -p /app/.tmp /app/.npm

COPY package*.json ./

# Use BuildKit cache mount at the SAME path npm uses
RUN npm ci

COPY . .
RUN npm run build -- --configuration=production